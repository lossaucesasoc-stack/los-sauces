import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DRIVE_API_URL } from './config.mjs';

const SESSION_KEY = 'los-sauces-session';

function savedSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (session?.access_token && session?.user?.id) return session;
  } catch {}
  return null;
}

export async function ensureAnonymousSession() {
  const existing = savedSession();
  if (existing) return existing;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const session = await response.json().catch(() => null);
  if (!response.ok || !session?.access_token) {
    throw new Error(session?.msg || session?.message || 'No se pudo iniciar la carga segura.');
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function rpc(name, body, accessToken = SUPABASE_PUBLISHABLE_KEY) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || 'No se pudo conectar con la base de datos.';
    throw new Error(message);
  }
  return data;
}

const nullable = value => value || null;

export async function createPerson(draft, accessToken) {
  const result = await rpc('registrar_persona', {
    p_carnet: draft.identity,
    p_nombre_completo: draft.name,
    p_fecha_nacimiento: nullable(draft.birth),
    p_telefono: draft.phone,
    p_direccion: draft.address,
    p_persona_apoyo: draft.representative,
    p_tipo_discapacidad: draft.disability,
    p_grado_discapacidad: draft.grade,
    p_numero_carnet_discapacidad: draft.disabilityNumber,
    p_porcentaje: draft.percentage === '' ? null : Number(draft.percentage),
    p_fecha_afiliacion: nullable(draft.affiliated)
  }, accessToken);
  return result?.[0] || null;
}

export async function uploadDocument(session, personId, item) {
  if (DRIVE_API_URL) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`No se pudo leer ${item.name}.`));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(item.file);
    });
    const response = await fetch(DRIVE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'upload', access_token: session.access_token, person_id: personId,
        type: item.type, side: item.side || 'Completo', name: item.name,
        mime: item.file.type, base64
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error || `No se pudo subir ${item.name} a Drive.`);
    return data.id;
  }
  const path = `${session.user.id}/${personId}/${item.name}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/expedientes/${encodeURI(path)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': item.file.type,
      'x-upsert': 'false'
    },
    body: item.file
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `No se pudo subir ${item.name}.`);
  await rpc('registrar_documento', {
    p_persona_id: personId,
    p_tipo: item.type,
    p_lado: item.side || 'Completo',
    p_nombre_archivo: item.name,
    p_storage_path: path,
    p_mime_type: item.file.type
  }, session.access_token);
  return path;
}

export async function findPublicRecord(identity) {
  const result = await rpc('consultar_ficha', { p_carnet: identity });
  if (!result?.length) return null;
  const row = result[0];
  return {
    id: row.registro,
    number: row.registro,
    name: row.nombre_completo,
    identity: row.carnet,
    birth: row.fecha_nacimiento || '',
    phone: row.telefono || '',
    address: row.direccion || '',
    representative: row.persona_apoyo || '',
    disability: row.tipo_discapacidad || '',
    grade: row.grado_discapacidad || '',
    disabilityNumber: row.numero_carnet_discapacidad || '',
    percentage: row.porcentaje ?? '',
    affiliated: row.fecha_afiliacion || '',
    status: row.estado,
    notes: row.observaciones || '',
    files: {},
    history: []
  };
}

