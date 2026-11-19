const SETTINGS = PropertiesService.getScriptProperties();

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, service: 'Los Sauces Drive API' });
}

function doPost(e) {
  try {
    const input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verifyUser_(input.access_token);
    if (input.action === 'upload') return json_(upload_(input, user));
    if (input.action === 'download') return json_(download_(input, user));
    throw new Error('ACCION_INVALIDA');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function verifyUser_(token) {
  if (!token) throw new Error('SESION_REQUERIDA');
  const url = required_('SUPABASE_URL') + '/auth/v1/user';
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      apikey: required_('SUPABASE_ANON_KEY'),
      Authorization: 'Bearer ' + token
    }
  });
  if (response.getResponseCode() !== 200) throw new Error('SESION_INVALIDA');
  return JSON.parse(response.getContentText());
}

function upload_(input, user) {
  if (!input.person_id || !input.name || !input.mime || !input.base64) {
    throw new Error('ARCHIVO_INCOMPLETO');
  }
  const person = supabase_(
    '/rest/v1/personas?id=eq.' + encodeURIComponent(input.person_id) +
    '&creado_por=eq.' + encodeURIComponent(user.id) +
    '&select=id,carnet,nombre_completo',
    'get'
  )[0];
  if (!person) throw new Error('REGISTRO_NO_AUTORIZADO');

  const root = DriveApp.getFolderById(required_('ROOT_FOLDER_ID'));
  const folderName = safe_(person.carnet + '_' + person.nombre_completo);
  const folders = root.getFoldersByName(folderName);
  const folder = folders.hasNext() ? folders.next() : root.createFolder(folderName);
  const bytes = Utilities.base64Decode(input.base64);
  const file = folder.createFile(Utilities.newBlob(bytes, input.mime, safe_(input.name)));

  supabase_('/rest/v1/documentos', 'post', {
    persona_id: person.id,
    tipo: input.type,
    lado: input.side || 'Completo',
    nombre_archivo: safe_(input.name),
    drive_file_id: file.getId(),
    mime_type: input.mime,
    vigente: true
  });
  return { ok: true, id: file.getId(), name: file.getName() };
}

function download_(input, user) {
  const admin = supabase_(
    '/rest/v1/administradores?usuario_id=eq.' + encodeURIComponent(user.id) +
    '&activo=eq.true&select=usuario_id',
    'get'
  )[0];
  if (!admin) throw new Error('ADMIN_NO_AUTORIZADO');
  const doc = supabase_(
    '/rest/v1/documentos?id=eq.' + encodeURIComponent(input.document_id) +
    '&vigente=eq.true&select=drive_file_id,nombre_archivo,mime_type',
    'get'
  )[0];
  if (!doc || !doc.drive_file_id) throw new Error('DOCUMENTO_NO_ENCONTRADO');
  const blob = DriveApp.getFileById(doc.drive_file_id).getBlob();
  return {
    ok: true,
    name: doc.nombre_archivo,
    mime: doc.mime_type,
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

function supabase_(path, method, body) {
  const key = required_('SUPABASE_SERVICE_ROLE_KEY');
  const options = {
    method: method,
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  };
  if (body !== undefined) options.payload = JSON.stringify(body);
  const response = UrlFetchApp.fetch(required_('SUPABASE_URL') + path, options);
  const text = response.getContentText();
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('SUPABASE_' + response.getResponseCode() + ': ' + text);
  }
  return text ? JSON.parse(text) : null;
}

function required_(key) {
  const value = SETTINGS.getProperty(key);
  if (!value) throw new Error('FALTA_CONFIGURAR_' + key);
  return value;
}

function safe_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 160);
}

