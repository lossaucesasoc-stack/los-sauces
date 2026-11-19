export const DOCUMENTS = Object.freeze([
  { id: 'foto', label: 'Fotografía personal', prefix: 'Foto' },
  { id: 'carnet', label: 'Carnet de identidad', prefix: 'Carnet' },
  { id: 'certificado', label: 'Certificado de nacimiento', prefix: 'Certificado_de_Nacimiento' },
  { id: 'discapacidad', label: 'Carnet de discapacidad', prefix: 'Carnet_de_Discapacidad' }
]);
// Catálogo provisional: confirmar los nombres y requisitos con la institución.
export const DISABILITIES = ['Física o motora', 'Visual', 'Auditiva', 'Intelectual', 'Mental o psíquica', 'Múltiple', 'Otra / pendiente de confirmar'];
export const GRADES = ['Leve', 'Moderada', 'Grave', 'Muy grave', 'Pendiente de confirmar'];
export const STATES = ['Pendiente de revisión', 'Observado', 'Completo'];

export function normalizeIdentity(value) {
  return String(value ?? '').normalize('NFKC').trim().toUpperCase().replace(/[\s.-]/g, '');
}
export function digitsOnly(value) {
  return String(value ?? '').normalize('NFKC').replace(/[^0-9]/g, '');
}
export function safePart(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);
}
export function filenameFor(type, name, original, side = '', revision = '') {
  const doc = DOCUMENTS.find(item => item.id === type);
  if (!doc) throw new Error('Tipo de documento inválido');
  const extension = String(original).split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'pdf'].includes(extension)) throw new Error('Formato no admitido');
  const part = safePart(name);
  if (!part) throw new Error('Falta el nombre de la persona');
  return [doc.prefix, part, safePart(side), safePart(revision)].filter(Boolean).join('_') + '.' + extension;
}
export function folderFor(identity, name) {
  return `${safePart(normalizeIdentity(identity))}_${safePart(name)}`;
}
export function validateFile(file, photo = false) {
  const extensions = photo ? ['jpg', 'jpeg', 'png'] : ['jpg', 'jpeg', 'png', 'pdf'];
  const ext = String(file.name).split('.').pop().toLowerCase();
  const expected = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
  if (!extensions.includes(ext) || file.type !== expected[ext]) return 'Selecciona un archivo JPG, PNG' + (photo ? '.' : ' o PDF.');
  if (file.size > 5 * 1024 * 1024) return 'El archivo debe pesar como máximo 5 MB.';
  if (file.size === 0) return 'El archivo está vacío.';
  return '';
}
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
