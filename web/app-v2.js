import { DOCUMENTS, DISABILITIES, GRADES, STATES, normalizeIdentity, digitsOnly, filenameFor, validateFile, escapeHtml as e } from './domain.mjs';
import { createCamera } from './camera.mjs';
import { ensureAnonymousSession, createPerson, uploadDocument, findPublicRecord } from './database.mjs';
import { getAdminSession, signInAdmin, signOutAdmin, listPeople, loadDocuments, loadHistory, updatePerson } from './admin-api.mjs';

const main = document.querySelector('main');
const viewer = document.querySelector('#viewer');
const blank = () => ({ name: '', identity: '', birth: '', phone: '', disability: '', disabilityNumber: '', grade: '', percentage: '', affiliated: '', address: '', representative: '', notes: '' });
let draft = blank();
let step = 0;
let chosen = {};
let activeTab = 'ficha';
let search = '';
let adminRecords = [];
const urls = new Set();
const records = [{ id: 'ejemplo', number: 'LS-DEMO-001', ...blank(), name: 'Persona de ejemplo', identity: '12345678', disability: 'Visual', grade: 'Grave', percentage: '60', status: 'Pendiente de revisi\u00f3n', notes: 'Este expediente es ficticio. Los documentos aún no han sido adjuntados.', files: {}, history: ['Expediente ficticio incluido para revisar el diseño.'] }];
const camera = createCamera((type, file) => attachFile(type, file));
const options = (items, selected = '') => '<option value="">Seleccionar una opción</option>' + items.map(x => `<option ${x === selected ? 'selected' : ''} value="${e(x)}">${e(x)}</option>`).join('');
const field = (key, label, type = 'text', required = false, extra = '') => `<div class="field"><label for="${key}">${label}${required ? ' <span aria-label="obligatorio">*</span>' : ''}</label><input id="${key}" name="${key}" type="${type}" value="${e(draft[key])}" ${required ? 'required' : ''} ${extra}></div>`;
const select = (key, label, items, required = false) => `<div class="field"><label for="${key}">${label}${required ? ' *' : ''}</label><select id="${key}" name="${key}" ${required ? 'required' : ''}>${options(items, draft[key])}</select></div>`;
const badge = status => `<span class="badge ${status === 'Completo' ? 'complete' : status === 'Observado' ? 'observed' : ''}">${e(status)}</span>`;
const value = x => e(x || 'No registrado');

function notify(message) {
  const target = document.querySelector('#notice');
  target.textContent = message;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { target.textContent = ''; }, 7000);
}
function keepValues(form) {
  for (const [key, val] of new FormData(form)) if (key in draft) draft[key] = String(val).trim();
  for (const item of Object.values(chosen)) item.name = filenameFor(item.type, draft.name, item.file.name, item.side);
}
function wireNumericInputs() {
  document.querySelectorAll('[data-digits]').forEach(input => {
    input.addEventListener('input', () => {
      const old = input.value;
      const start = input.selectionStart;
      const next = digitsOnly(old);
      if (next !== old) {
        input.value = next;
        if (start !== null) {
          const caret = digitsOnly(old.slice(0, start)).length;
          input.setSelectionRange(caret, caret);
        }
      }
    });
  });
}
function photo(record) {
  const item = Object.values(record.files || {}).find(f => f.type === 'foto');
  return item ? `<img class="portrait" src="${item.url}" alt="Fotografía de ${e(record.name)}">` : '<div class="portrait placeholder" aria-label="Fotografía pendiente"><span aria-hidden="true">♙</span><small>Foto pendiente</small></div>';
}
function navigate() {
  camera.close();
  const route = location.hash.slice(1) || 'inicio';
  document.body.classList.remove('printing');
  if (route === 'registro') registration();
  else if (route === 'consulta') consultation();
  else if (route === 'administracion') administration();
  else home();
  main.focus({ preventScroll: true });
}
function home() {
  main.innerHTML = `<section class="hero"><div><p class="eyebrow">ASOCIACIÓN LOS SAUCES · MONTEAGUDO</p><h1>Tu registro,<br><span>más sencillo.</span></h1><p class="lead">Regístrate, consulta tu información y conoce cómo va tu expediente. Desde tu celular o computadora.</p><div class="hero-actions"><a href="#registro" class="button primary">Registrarme <span aria-hidden="true">→</span></a><a href="#consulta" class="button secondary">Consultar mi registro</a></div><p class="hint">También puede ayudarte un familiar o una persona de confianza.</p></div><div class="hero-emblem"><img src="assets/logo-los-sauces.png" alt="Asociación de Personas con Discapacidad Los Sauces, Monteagudo"><span>Estamos para acompañarte</span></div></section>
  <section class="services" aria-label="Opciones de atención"><a href="#registro" class="service"><span class="service-number">01</span><h2>Quiero registrarme</h2><p>Completa tus datos paso a paso y adjunta tus documentos.</p><span class="service-action">Comenzar registro →</span></a><a href="#consulta" class="service"><span class="service-number">02</span><h2>Ya estoy registrado</h2><p>Consulta con tu N\u00famero de carnet y revisa tu ficha.</p><span class="service-action">Consultar mi registro →</span></a><a href="#administracion" class="service"><span class="service-number">03</span><h2>Administraci\u00f3n</h2><p>Vista previa del panel de atención y revisi\u00f3n de expedientes.</p><span class="service-action">Revisar panel de prueba →</span></a></section><aside class="help"><strong>Una página pensada para ti.</strong><p>Letras grandes, pasos cortos y opciones claras. Puedes aumentar el tamaño de letra con el botón del encabezado.</p></aside>`;
  const adminService = document.querySelectorAll('.service')[2];
  if (adminService) {
    adminService.querySelector('p').textContent = 'Acceso protegido para revisar y gestionar expedientes.';
    adminService.querySelector('.service-action').textContent = 'Ingresar al panel';
  }
}
function registration() {
  const names = ['Datos personales', 'Discapacidad', 'Documentos', 'Revisar'];
  let content = '';
  if (step === 0) content = `<h2>Comencemos con tus datos</h2><p>Los campos con * son obligatorios.</p><div class="form-grid">${field('name', 'Nombre completo', 'text', true, 'autocomplete="name" maxlength="140"')}${field('identity', 'N\u00famero de carnet de identidad', 'text', true, 'inputmode="numeric" pattern="[0-9]+" data-digits autocomplete="off" maxlength="20" title="Escribe solo N\u00fameros" aria-describedby="identity-help"')}${field('birth', 'Fecha de nacimiento', 'date', false, `max="${new Date().toISOString().slice(0, 10)}"`)}${field('phone', 'Teléfono celular de contacto', 'tel', true, 'inputmode="numeric" pattern="[0-9]{8,15}" data-digits autocomplete="tel-national" minlength="8" maxlength="15" title="Escribe entre 8 y 15 N\u00fameros, sin espacios ni signos" aria-describedby="phone-help"')}${field('address', 'Dirección o comunidad', 'text', false, 'autocomplete="street-address" maxlength="250"')}${field('representative', 'Familiar o persona de apoyo (opcional)', 'text', false, 'maxlength="140"')}</div><p class="hint" id="identity-help">Escribe solo los N\u00fameros de tu carnet, sin puntos ni espacios.</p><p class="hint" id="phone-help">El celular de contacto es obligatorio. Puede ser tuyo o de un familiar. Escribe de 8 a 15 N\u00fameros.</p>`;
  if (step === 1) content = `<h2>Información de discapacidad</h2><p>Selecciona los datos que aparecen en tu carnet de discapacidad.</p><div class="form-grid">${select('disability', 'Tipo de discapacidad', DISABILITIES, true)}${select('grade', 'Grado de discapacidad', GRADES, true)}${field('disabilityNumber', 'N\u00famero de carnet de discapacidad', 'text', false, 'inputmode="numeric" pattern="[0-9]*" data-digits maxlength="30" title="Escribe solo N\u00fameros"')}${field('percentage', 'Porcentaje, si figura en el documento', 'number', false, 'min="0" max="100" step="1"')}${field('affiliated', 'Fecha de afiliación, si ya pertenece a la asociación', 'date', false, `max="${new Date().toISOString().slice(0, 10)}"`)}</div><p class="info">Las opciones de esta vista previa deben confirmarse con la institución.</p>`;
  if (step === 2) content = `<h2>Adjunta tus documentos</h2><p>Puedes elegir un archivo o tomar una foto. La página pondrá el nombre correcto automáticamente.</p><p class="hint">JPG, PNG o PDF · Hasta 5 MB por archivo. En esta prueba los archivos permanecen en esta pestaña.</p><div class="uploads">${DOCUMENTS.map(doc => `<article class="upload"><h3>${doc.label}</h3>${doc.id === 'foto' ? '' : `<label for="side-${doc.id}">Parte del documento</label><select id="side-${doc.id}"><option value="">Documento completo</option><option value="Anverso">Anverso</option><option value="Reverso">Reverso</option></select>`}<div class="upload-actions"><button class="button secondary" type="button" data-choose="${doc.id}">Elegir ${doc.id === 'foto' ? 'foto' : 'archivo'}</button><button class="button primary" type="button" data-camera="${doc.id}" aria-label="Tomar foto: ${doc.label}">Tomar foto</button></div><input hidden id="file-${doc.id}" type="file" accept="${doc.id === 'foto' ? 'image/jpeg,image/png' : 'image/jpeg,image/png,application/pdf'}" aria-label="Adjuntar ${doc.label}" data-document="${doc.id}"><div id="chosen-${doc.id}" class="chosen-list">${fileList(chosen, doc.id)}</div></article>`).join('')}</div><p class="info">Catálogo provisional: falta confirmar la lista completa de requisitos de la institución.</p>`;
  if (step === 3) content = `<h2>Revisa antes de terminar</h2><p>Comprueba que tus datos estén correctos. Puedes volver para corregirlos.</p>${sheet({ ...draft, number: 'Vista previa', status: 'Pendiente de revisi\u00f3n', files: chosen }, false)}<label class="check"><input type="checkbox" name="confirm" required> He revisado los datos de esta prueba.</label><p class="info">Este registro es de demostración. No se enviará a Supabase ni a Google Drive y se perderá al recargar la página.</p>`;
  main.innerHTML = `<div class="page-heading"><a href="#inicio" class="back">← Volver al inicio</a><h1>Registrarme</h1><p>Un paso a la vez. Puedes revisar todo antes de terminar.</p></div><ol class="steps">${names.map((name, n) => `<li ${n === step ? 'aria-current="step"' : ''} class="${n <= step ? 'active' : ''}"><span>${n + 1}</span>${name}</li>`).join('')}</ol><form id="registration" class="panel">${content}<div class="form-actions">${step ? '<button type="button" class="button secondary" id="previous">← Anterior</button>' : '<a href="#inicio" class="button secondary">Salir</a>'}<button class="button primary" type="submit">${step === 3 ? 'Guardar registro de prueba' : 'Continuar →'}</button></div></form>`;
  if (step === 2) {
    const uploadHint = document.querySelector('#registration > .hint');
    if (uploadHint) uploadHint.textContent = 'JPG, PNG o PDF. M\u00e1ximo 5 MB por archivo. Los documentos se guardar\u00e1n de forma privada.';
  }
  if (step === 3) {
    const sendInfo = document.querySelector('#registration > .info');
    if (sendInfo) sendInfo.textContent = 'Al guardar, tus datos y documentos ser\u00e1n enviados de forma segura a la Asociaci\u00f3n Los Sauces.';
    document.querySelector('#registration button[type="submit"]').textContent = 'Enviar mi registro';
  }
  document.querySelector('#registration').onsubmit = async event => {
    event.preventDefault();
    keepValues(event.currentTarget);
    if (step === 0 && (!draft.name.trim() || !normalizeIdentity(draft.identity))) { notify('Completa el nombre y el N\u00famero de carnet.'); return; }
    if (step < 3) { step++; registration(); main.focus(); return; }
    const submitButton = event.submitter;
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando de forma segura...';
    try {
      const savedIdentity = normalizeIdentity(draft.identity);
      const session = await ensureAnonymousSession();
      const created = await createPerson({ ...draft, identity: savedIdentity }, session.access_token);
      if (!created) throw new Error('Supabase no devolvi\u00f3 el registro creado.');
      const pendingFiles = Object.values(chosen);
      for (let index = 0; index < pendingFiles.length; index++) {
        submitButton.textContent = `Subiendo documento ${index + 1} de ${pendingFiles.length}...`;
        await uploadDocument(session, created.id, pendingFiles[index]);
      }
      const savedRecord = { ...draft, identity: savedIdentity, id: created.id, number: created.registro, status: 'Pendiente de revisi\u00f3n', files: { ...chosen }, history: ['Registro enviado a la instituci\u00f3n.'] };
      records.push(savedRecord);
      draft = blank(); chosen = {}; step = 0;
      main.innerHTML = `<section class="success panel"><span class="success-icon" aria-hidden="true">&#10003;</span><h1>Tu registro fue enviado</h1><p>N\u00famero: <strong>${e(savedRecord.number)}</strong></p><p>La Asociaci\u00f3n Los Sauces revisar\u00e1 tus datos y documentos.</p><div class="hero-actions"><button class="button primary" id="show-saved">Ver mi ficha</button><a href="#inicio" class="button secondary">Volver al inicio</a></div></section>`;
      document.querySelector('#show-saved').onclick = () => showRecord(savedRecord, false);
    } catch (error) {
      const known = error.message?.includes('CARNET_YA_REGISTRADO')
        ? 'Ese carnet ya est\u00e1 registrado. Usa la opci\u00f3n Consultar mi registro.'
        : error.message;
      notify(known || 'No se pudo guardar el registro. Intenta nuevamente.');
      submitButton.disabled = false;
      submitButton.textContent = 'Guardar registro';
    }
    return;
    const identity = normalizeIdentity(draft.identity);
    if (records.some(r => normalizeIdentity(r.identity) === identity)) { notify('Ese carnet ya tiene un registro de prueba. Consulta el expediente existente.'); return; }
    const record = { ...draft, identity, id: crypto.randomUUID(), number: `LS-DEMO-${String(records.length + 1).padStart(3, '0')}`, status: 'Pendiente de revisi\u00f3n', files: { ...chosen }, history: ['Registro de prueba creado en esta pestaña.'] };
    records.push(record);
    draft = blank(); chosen = {}; step = 0;
    main.innerHTML = `<section class="success panel"><span class="success-icon" aria-hidden="true">✓</span><h1>Tu registro de prueba está listo</h1><p>N\u00famero: <strong>${e(record.number)}</strong></p><p>Se conserva únicamente mientras esta pestaña siga abierta, sin recargarla.</p><div class="hero-actions"><button class="button primary" id="show-saved">Ver mi ficha</button><a href="#inicio" class="button secondary">Volver al inicio</a></div></section>`;
    document.querySelector('#show-saved').onclick = () => showRecord(record, false);
  };
  const previous = document.querySelector('#previous');
  if (previous) previous.onclick = () => { keepValues(document.querySelector('#registration')); step--; registration(); };
  document.querySelectorAll('[data-document]').forEach(input => input.onchange = () => attach(input));
  document.querySelectorAll('[data-choose]').forEach(button => button.onclick = () => document.querySelector(`#file-${button.dataset.choose}`).click());
  document.querySelectorAll('[data-camera]').forEach(button => button.onclick = () => {
    const type = button.dataset.camera;
    camera.open(type, DOCUMENTS.find(doc => doc.id === type).label);
  });
  wireNumericInputs();
  wireFileActions();
}
function fileList(files, type) {
  const entries = Object.entries(files).filter(([, f]) => f.type === type);
  if (!entries.length) return '<p class="muted">Sin archivo adjunto</p>';
  return entries.map(([key, f]) => `<div class="chosen"><span>${e(f.name)}</span><button type="button" class="text-button" data-view="${e(key)}">Ver</button><button type="button" class="text-button" data-remove="${e(key)}" aria-label="Quitar ${e(f.name)}">Quitar</button></div>`).join('');
}
function attach(input) {
  const file = input.files?.[0];
  if (!file) return;
  const type = input.dataset.document;
  attachFile(type, file);
  input.value = '';
}
function attachFile(type, file) {
  const issue = validateFile(file, type === 'foto');
  if (issue) { notify(issue); return; }
  const side = document.querySelector(`#side-${type}`)?.value || '';
  const key = `${type}-${side || 'Completo'}`;
  const name = filenameFor(type, draft.name, file.name, side);
  if (chosen[key]) { URL.revokeObjectURL(chosen[key].url); urls.delete(chosen[key].url); }
  const url = URL.createObjectURL(file); urls.add(url);
  chosen[key] = { name, type, side, url, mime: file.type, file };
  document.querySelector(`#chosen-${type}`).innerHTML = fileList(chosen, type);
  wireFileActions(); notify('Archivo adjuntado a esta prueba: ' + name);
}
function wireFileActions() {
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => openDocument(chosen[button.dataset.view]));
  document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
    const f = chosen[button.dataset.remove];
    URL.revokeObjectURL(f.url); urls.delete(f.url); delete chosen[button.dataset.remove];
    document.querySelector(`#chosen-${f.type}`).innerHTML = fileList(chosen, f.type); wireFileActions();
  });
}
function openDocument(file) {
  if (!file) return;
  document.querySelector('#viewer-title').textContent = file.name;
  document.querySelector('#viewer-content').innerHTML = `${file.mime === 'application/pdf' ? `<iframe title="${e(file.name)}" src="${file.url}"></iframe>` : `<img alt="${e(file.name)}" src="${file.url}">`}<a class="button primary" href="${file.url}" download="${e(file.name)}">Descargar archivo</a>`;
  viewer.showModal();
}
document.querySelector('#close-viewer').onclick = () => viewer.close();
viewer.addEventListener('close', () => { document.querySelector('#viewer-content').replaceChildren(); });
function sheet(record, printable = true) {
  const cells = [['Nombre completo', record.name], ['Carnet de identidad', record.identity], ['Fecha de nacimiento', record.birth], ['Carnet de discapacidad', record.disabilityNumber], ['Tipo de discapacidad', record.disability], ['Grado', record.grade], ['Porcentaje', record.percentage ? record.percentage + '%' : ''], ['Fecha de afiliación', record.affiliated], ['Teléfono celular', record.phone], ['Dirección o comunidad', record.address], ['Persona de apoyo', record.representative]];
  return `<article class="sheet ${printable ? 'print-sheet' : ''}"><img class="watermark" src="assets/logo-los-sauces.png" alt="" aria-hidden="true"><div class="sheet-content"><div class="sheet-header"><img src="assets/logo-los-sauces.png" alt="Logo Los Sauces"><div><strong>Asociación de Personas con Discapacidad</strong><h2>Los Sauces · Monteagudo</h2><p>Ficha individual de registro</p></div></div><div class="sheet-top"><div><p class="eyebrow">${e(record.number)}</p><h3>${e(record.name)}</h3>${badge(record.status)}<p class="hint">Fecha de emisión: ${new Date().toLocaleDateString('es-BO')}</p></div>${photo(record)}</div><dl class="data-grid">${cells.map(([label, val]) => `<div><dt>${label}</dt><dd>${value(val)}</dd></div>`).join('')}</dl><div class="sheet-docs"><h3>Documentación</h3>${DOCUMENTS.map(doc => `<p><strong>${doc.label}:</strong> ${Object.values(record.files || {}).some(f => f.type === doc.id) ? 'Adjuntado · pendiente de validación' : 'Pendiente'}</p>`).join('')}</div><div class="sheet-notes"><h3>Observaciones</h3><p>${value(record.notes)}</p></div><div class="sheet-footer">VISTA PREVIA · Datos de prueba · Sin validez institucional</div></div></article>`;
}
function consultation() {
  main.innerHTML = `<section class="lookup"><a href="#inicio" class="back">← Volver al inicio</a><p class="eyebrow">CONSULTA PERSONAL</p><h1>Consulta tu registro</h1><p class="lead">Introduce tu N\u00famero de carnet para ver tu ficha.</p><form id="lookup-form" class="panel"><label for="lookup">N\u00famero de carnet de identidad</label><input id="lookup" type="text" inputmode="numeric" pattern="[0-9]+" data-digits maxlength="20" autocomplete="off" required title="Escribe solo N\u00fameros" aria-describedby="lookup-help"><p id="lookup-help" class="hint">Para probar el diseño escribe <strong>12345678</strong>, o el carnet de un registro de prueba creado en esta pestaña.</p><button class="button primary full" type="submit">Consultar mi registro →</button><p id="lookup-error" role="alert"></p></form></section>`;
  document.querySelector('#lookup-help').textContent = 'Escribe solamente los n\u00fameros de tu carnet, sin puntos, espacios ni letras.';
  wireNumericInputs();
  document.querySelector('#lookup-form').onsubmit = async event => {
    event.preventDefault();
    const lookupButton = event.submitter;
    const lookupError = document.querySelector('#lookup-error');
    lookupButton.disabled = true;
    lookupButton.textContent = 'Consultando...';
    lookupError.textContent = '';
    try {
      const identity = normalizeIdentity(document.querySelector('#lookup').value);
      const publicRecord = await findPublicRecord(identity);
      if (publicRecord) showRecord(publicRecord, false);
      else lookupError.textContent = 'No encontramos un registro con ese n\u00famero de carnet. Revisa que est\u00e1 escrito correctamente.';
    } catch {
      lookupError.textContent = 'No se pudo consultar en este momento. Revisa tu conexi\u00f3n e intenta nuevamente.';
    } finally {
      if (lookupButton.isConnected) {
        lookupButton.disabled = false;
        lookupButton.textContent = 'Consultar mi registro';
      }
    }
    return;
    const record = records.find(r => normalizeIdentity(r.identity) === normalizeIdentity(document.querySelector('#lookup').value));
    if (record) showRecord(record, false);
    else document.querySelector('#lookup-error').textContent = 'No encontramos ese carnet en los registros de esta prueba. Revisa el N\u00famero o prueba con 12345678.';
  };
}
function printRecord(record) {
  const oldTitle = document.title;
  document.title = `Ficha_${record.name.replace(/\s+/g, '_')}`;
  document.body.classList.add('printing');
  const cleanup = () => { document.body.classList.remove('printing'); document.title = oldTitle; };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
}
function showRecord(record, admin) {
  main.innerHTML = `<div class="page-heading"><button class="text-button" id="return-record">← ${admin ? 'Volver a expedientes' : 'Volver a consulta'}</button><div class="heading-line"><div><p class="eyebrow">${admin ? 'EXPEDIENTE' : 'MI REGISTRO'}</p><h1>${e(record.name)}</h1></div><button id="print" class="button primary">Imprimir / Guardar PDF</button></div></div>${admin ? `<nav class="tabs" aria-label="Secciones del expediente">${[['ficha', 'Ficha personal'], ['documentos', 'Documentos'], ['observaciones', 'Observaciones'], ['historial', 'Historial']].map(([id, label]) => `<button class="${activeTab === id ? 'selected' : ''}" ${activeTab === id ? 'aria-current="page"' : ''} data-tab="${id}">${label}</button>`).join('')}</nav>` : ''}<div id="record-content"></div>`;
  document.querySelector('#return-record').onclick = admin ? administration : consultation;
  // La ficha siempre existe para imprimirla, incluso al revisar otra pestaña.
  const content = document.querySelector('#record-content');
  content.innerHTML = `<div class="${admin && activeTab !== 'ficha' ? 'print-only' : ''}">${sheet(record)}</div>`;
  content.querySelectorAll('.sheet-footer').forEach(footer => {
    footer.textContent = 'Documento generado por la Asociaci\u00f3n de Personas con Discapacidad Los Sauces';
  });
  if (admin && activeTab === 'documentos') {
    content.innerHTML += `<section class="panel no-print"><h2>Documentos del expediente</h2><p>Los archivos de esta prueba solo están disponibles en la pestaña actual.</p>${DOCUMENTS.map(doc => { const found = Object.entries(record.files).filter(([, f]) => f.type === doc.id); return `<article class="doc-row"><div><h3>${doc.label}</h3><p>${found.length ? 'Adjuntado · pendiente de validación' : 'Pendiente de entrega'}</p></div><div>${found.map(([key, f]) => `<button class="button secondary" data-open="${e(key)}">Ver ${e(f.side || 'documento')}</button>`).join('')}</div></article>`; }).join('')}</section>`;
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openDocument(record.files[b.dataset.open]));
  }
  if (admin && activeTab === 'observaciones') {
    content.innerHTML += `<form id="review" class="panel no-print"><h2>Revisar expediente</h2><label for="state">Estado del expediente</label><select id="state">${STATES.map(s => `<option ${s === record.status ? 'selected' : ''}>${s}</option>`).join('')}</select><label for="notes">Observaciones para la persona registrada</label><textarea id="notes" rows="5" maxlength="2000">${e(record.notes)}</textarea><button class="button primary" type="submit">Guardar cambios de prueba</button></form>`;
    document.querySelector('#review').onsubmit = event => { event.preventDefault(); record.status = document.querySelector('#state').value; record.notes = document.querySelector('#notes').value; record.history.push('revisi\u00f3n de prueba: ' + record.status); showRecord(record, true); notify('Cambios guardados únicamente en esta pestaña.'); };
  }
  if (admin && activeTab === 'observaciones' && record._real) {
    document.querySelector('#review').onsubmit = async event => {
      event.preventDefault();
      record.status = document.querySelector('#state').value;
      record.notes = document.querySelector('#notes').value;
      const button = event.submitter;
      button.disabled = true; button.textContent = 'Guardando...';
      try {
        await updatePerson(getAdminSession(), record);
        record.history.unshift(`Ahora: Revisi\u00f3n administrativa: ${record.status}`);
        showRecord(record, true);
        notify('Cambios guardados correctamente.');
      } catch (problem) {
        notify(problem.message || 'No se pudieron guardar los cambios.');
        button.disabled = false; button.textContent = 'Guardar cambios';
      }
    };
  }
  if (admin && activeTab === 'historial') content.innerHTML += `<section class="panel no-print"><h2>Historial del expediente</h2><ol class="history">${record.history.map(item => `<li>${e(item)}</li>`).join('')}</ol></section>`;
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { activeTab = b.dataset.tab; showRecord(record, true); });
  document.querySelector('#print').onclick = () => printRecord(record);
  main.focus();
}
function administration() {
  realAdministration();
  return;
  main.innerHTML = `<div class="page-heading"><a class="back" href="#inicio">← Volver al inicio</a><div class="heading-line"><div><p class="eyebrow">Administraci\u00f3n · VISTA PREVIA</p><h1>Expedientes</h1><p>Encuentra una persona y revisa su información.</p></div><a class="button primary" href="#registro">+ Nuevo registro de prueba</a></div></div><div class="stats">${[['Registrados', records.length], ['Pendientes de revisi\u00f3n', records.filter(r => r.status === STATES[0]).length], ['Observados', records.filter(r => r.status === STATES[1]).length], ['Completos', records.filter(r => r.status === STATES[2]).length]].map(([name, count]) => `<div><span>${name}</span><strong>${count}</strong></div>`).join('')}</div><section class="panel"><div class="filters"><div class="field"><label for="search">Buscar por nombre, carnet o registro</label><input id="search" type="search" value="${e(search)}" placeholder="Escribe aquí…"></div><div class="field"><label for="status-filter">Estado</label><select id="status-filter"><option value="">Todos los estados</option>${STATES.map(s => `<option>${s}</option>`).join('')}</select></div><button class="button secondary" id="export">Exportar CSV</button></div><p class="info">Panel de demostración, sin inicio de sesi\u00f3n real. Las cuentas de administradores se conectarán a Supabase antes de usar datos reales.</p><div class="table-wrap"><table><thead><tr><th scope="col">Persona</th><th scope="col">Carnet</th><th scope="col">Discapacidad</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody id="records"></tbody></table></div><p id="result-count" class="hint" aria-live="polite"></p></section>`;
  const filtered = () => records.filter(r => `${r.name} ${r.identity} ${r.number}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')) && (!document.querySelector('#status-filter').value || r.status === document.querySelector('#status-filter').value));
  function draw() {
    const found = filtered();
    document.querySelector('#records').innerHTML = found.length ? found.map(r => `<tr><td><strong>${e(r.name)}</strong><small>${e(r.number)}</small></td><td>${e(r.identity)}</td><td>${e(r.disability)}</td><td>${badge(r.status)}</td><td><button class="button small secondary" data-record="${r.id}">Ver expediente</button></td></tr>`).join('') : '<tr><td colspan="5">No hay registros que coincidan con tu búsqueda.</td></tr>';
    document.querySelector('#result-count').textContent = `${found.length} expediente(s) en esta prueba.`;
    document.querySelectorAll('[data-record]').forEach(b => b.onclick = () => { activeTab = 'ficha'; showRecord(records.find(r => r.id === b.dataset.record), true); });
  }
  document.querySelector('#search').oninput = event => { search = event.target.value; draw(); };
  document.querySelector('#status-filter').onchange = draw;
  document.querySelector('#export').onclick = () => {
    const cell = value => { let v = String(value ?? ''); if (/^[\s]*[=+@-]/.test(v)) v = "'" + v; return '"' + v.replaceAll('"', '""') + '"'; };
    const rows = [['Registro', 'Nombre', 'Carnet', 'Discapacidad', 'Grado', 'Estado'], ...filtered().map(r => [r.number, r.name, r.identity, r.disability, r.grade, r.status])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Los_Sauces_Registros_de_prueba.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  draw();
}

async function realAdministration() {
  const session = getAdminSession();
  if (!session) {
    main.innerHTML = `<section class="lookup"><a href="#inicio" class="back">Volver al inicio</a><p class="eyebrow">ACCESO RESTRINGIDO</p><h1>Administraci\u00f3n</h1><p class="lead">Ingresa con la cuenta autorizada por la instituci\u00f3n.</p><form id="admin-login" class="panel"><div class="field"><label for="admin-email">Correo electr\u00f3nico</label><input id="admin-email" type="email" autocomplete="username" required></div><div class="field"><label for="admin-password">Contrase\u00f1a</label><input id="admin-password" type="password" autocomplete="current-password" required></div><button class="button primary full" type="submit">Ingresar</button><p id="admin-error" role="alert"></p></form></section>`;
    document.querySelector('#admin-login').onsubmit = async event => {
      event.preventDefault();
      const button = event.submitter;
      const error = document.querySelector('#admin-error');
      button.disabled = true; button.textContent = 'Ingresando...'; error.textContent = '';
      try {
        await signInAdmin(document.querySelector('#admin-email').value.trim(), document.querySelector('#admin-password').value);
        await realAdministration();
      } catch (problem) {
        error.textContent = problem.message || 'No se pudo iniciar sesi\u00f3n.';
        button.disabled = false; button.textContent = 'Ingresar';
      }
    };
    return;
  }

  main.innerHTML = `<section class="panel"><p>Cargando expedientes...</p></section>`;
  try {
    adminRecords = await listPeople(session);
  } catch (problem) {
    main.innerHTML = `<section class="panel"><h1>No se pudieron cargar los expedientes</h1><p>${e(problem.message)}</p><button class="button secondary" id="admin-exit">Cerrar sesi\u00f3n</button></section>`;
    document.querySelector('#admin-exit').onclick = () => { signOutAdmin(); realAdministration(); };
    return;
  }

  main.innerHTML = `<div class="page-heading"><a class="back" href="#inicio">Volver al inicio</a><div class="heading-line"><div><p class="eyebrow">ADMINISTRACI\u00d3N</p><h1>Expedientes</h1><p>Sesi\u00f3n de ${e(session.admin_name || 'administrador')}.</p></div><button class="button secondary" id="admin-exit">Cerrar sesi\u00f3n</button></div></div><div class="stats">${[['Registrados', adminRecords.length], ['Pendientes de revisi\u00f3n', adminRecords.filter(r => r.status === STATES[0]).length], ['Observados', adminRecords.filter(r => r.status === STATES[1]).length], ['Completos', adminRecords.filter(r => r.status === STATES[2]).length]].map(([name, count]) => `<div><span>${name}</span><strong>${count}</strong></div>`).join('')}</div><section class="panel"><div class="filters"><div class="field"><label for="search">Buscar por nombre, carnet o registro</label><input id="search" type="search" placeholder="Escribe aqu\u00ed."></div><div class="field"><label for="status-filter">Estado</label><select id="status-filter"><option value="">Todos los estados</option>${STATES.map(s => `<option>${s}</option>`).join('')}</select></div><button class="button secondary" id="export">Exportar CSV</button></div><div class="table-wrap"><table><thead><tr><th>Persona</th><th>Carnet</th><th>Discapacidad</th><th>Estado</th><th>Acci\u00f3n</th></tr></thead><tbody id="records"></tbody></table></div><p id="result-count" class="hint" aria-live="polite"></p></section>`;
  document.querySelector('#admin-exit').onclick = () => { signOutAdmin(); realAdministration(); };
  const filtered = () => {
    const term = document.querySelector('#search').value.toLocaleLowerCase('es');
    const status = document.querySelector('#status-filter').value;
    return adminRecords.filter(r => `${r.name} ${r.identity} ${r.number}`.toLocaleLowerCase('es').includes(term) && (!status || r.status === status));
  };
  const draw = () => {
    const found = filtered();
    document.querySelector('#records').innerHTML = found.length ? found.map(r => `<tr><td><strong>${e(r.name)}</strong><small>${e(r.number)}</small></td><td>${e(r.identity)}</td><td>${e(r.disability)}</td><td>${badge(r.status)}</td><td><button class="button small secondary" data-real-record="${r.id}">Ver expediente</button></td></tr>`).join('') : '<tr><td colspan="5">No hay registros que coincidan.</td></tr>';
    document.querySelector('#result-count').textContent = `${found.length} expediente(s).`;
    document.querySelectorAll('[data-real-record]').forEach(button => button.onclick = async () => {
      const record = adminRecords.find(item => item.id === button.dataset.realRecord);
      button.disabled = true; button.textContent = 'Abriendo...';
      try {
        [record.files, record.history] = await Promise.all([loadDocuments(session, record.id), loadHistory(session, record.id)]);
        activeTab = 'ficha'; showRecord(record, true);
      } catch (problem) { notify(problem.message); button.disabled = false; button.textContent = 'Ver expediente'; }
    });
  };
  document.querySelector('#search').oninput = draw;
  document.querySelector('#status-filter').onchange = draw;
  document.querySelector('#export').onclick = () => {
    const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Registro', 'Nombre', 'Carnet', 'Discapacidad', 'Grado', 'Estado'], ...filtered().map(r => [r.number, r.name, r.identity, r.disability, r.grade, r.status])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'Los_Sauces_Registros.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  draw();
}
document.querySelector('#font-toggle').onclick = event => {
  const large = document.documentElement.classList.toggle('large-text');
  event.currentTarget.setAttribute('aria-pressed', String(large));
  event.currentTarget.textContent = large ? 'Letra normal' : 'Aumentar letra';
};
window.addEventListener('hashchange', navigate);
window.addEventListener('beforeunload', () => { for (const url of urls) URL.revokeObjectURL(url); });
navigate();
