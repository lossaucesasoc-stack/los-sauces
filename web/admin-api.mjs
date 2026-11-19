import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DRIVE_API_URL } from './config.mjs';

const ADMIN_SESSION_KEY = 'los-sauces-admin-session';

function headers(token, extra = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.msg || 'Operaci\u00f3n no disponible.');
  return data;
}

export function getAdminSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY));
    return session?.access_token ? session : null;
  } catch { return null; }
}

export async function signInAdmin(email, password) {
  const session = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const profile = await request(`/rest/v1/administradores?usuario_id=eq.${session.user.id}&activo=eq.true&select=nombre`, {
    headers: headers(session.access_token)
  });
  if (!profile.length) throw new Error('Esta cuenta no tiene autorizaci\u00f3n de administrador.');
  session.admin_name = profile[0].nombre;
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOutAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function listPeople(session) {
  const select = 'id,numero_registro,carnet,nombre_completo,fecha_nacimiento,telefono,direccion,persona_apoyo,tipo_discapacidad,grado_discapacidad,numero_carnet_discapacidad,porcentaje,fecha_afiliacion,estado,observaciones_publicas,creado_en';
  const rows = await request(`/rest/v1/personas?select=${select}&activo=eq.true&order=creado_en.desc`, {
    headers: headers(session.access_token)
  });
  return rows.map(row => ({
    id: row.id,
    number: `LS-${String(row.numero_registro).padStart(6, '0')}`,
    identity: row.carnet,
    name: row.nombre_completo,
    birth: row.fecha_nacimiento || '',
    phone: row.telefono,
    address: row.direccion || '',
    representative: row.persona_apoyo || '',
    disability: row.tipo_discapacidad,
    grade: row.grado_discapacidad,
    disabilityNumber: row.numero_carnet_discapacidad || '',
    percentage: row.porcentaje ?? '',
    affiliated: row.fecha_afiliacion || '',
    status: row.estado,
    notes: row.observaciones_publicas || '',
    files: {},
    history: [],
    _real: true
  }));
}

export async function loadDocuments(session, personId) {
  const docs = await request(`/rest/v1/documentos?persona_id=eq.${personId}&vigente=eq.true&select=id,tipo,lado,nombre_archivo,storage_path,drive_file_id,mime_type`, {
    headers: headers(session.access_token)
  });
  const files = {};
  for (const doc of docs) {
    let url = '';
    if (doc.drive_file_id && DRIVE_API_URL) {
      const response = await fetch(DRIVE_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'download', access_token: session.access_token, document_id: doc.id })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `No se pudo abrir ${doc.nombre_archivo}.`);
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: data.mime }));
    } else if (doc.storage_path) {
      const signed = await request(`/storage/v1/object/sign/expedientes/${encodeURI(doc.storage_path)}`, {
        method: 'POST', headers: headers(session.access_token), body: JSON.stringify({ expiresIn: 3600 })
      });
      url = signed.signedURL?.startsWith('http') ? signed.signedURL : `${SUPABASE_URL}/storage/v1${signed.signedURL}`;
    } else continue;
    files[doc.id] = { type: doc.tipo, side: doc.lado, name: doc.nombre_archivo, mime: doc.mime_type, url };
  }
  return files;
}

export async function loadHistory(session, personId) {
  const rows = await request(`/rest/v1/historial?persona_id=eq.${personId}&select=accion,creado_en&order=creado_en.desc`, {
    headers: headers(session.access_token)
  });
  return rows.map(row => `${new Date(row.creado_en).toLocaleString('es-BO')}: ${row.accion}`);
}

export async function updatePerson(session, record) {
  await request(`/rest/v1/personas?id=eq.${record.id}`, {
    method: 'PATCH',
    headers: headers(session.access_token, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ estado: record.status, observaciones_publicas: record.notes, actualizado_en: new Date().toISOString() })
  });
  await request('/rest/v1/historial', {
    method: 'POST',
    headers: headers(session.access_token, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ persona_id: record.id, usuario_id: session.user.id, accion: `Revisi\u00f3n administrativa: ${record.status}` })
  });
}

