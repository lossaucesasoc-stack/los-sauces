import test from 'node:test';
import assert from 'node:assert/strict';
import { filenameFor, folderFor, normalizeIdentity, digitsOnly, validateFile, escapeHtml } from '../web/domain.mjs';
test('identifica y nombra documentos, con anverso y revisiones', () => {
  assert.equal(filenameFor('carnet', 'Mar�a P�rez L�pez', 'IMG_1234.JPG', 'Anverso'), 'Carnet_Maria_Perez_Lopez_Anverso.jpg');
  assert.equal(filenameFor('discapacidad', 'Jos� Roca', 'original.pdf', '', 'v2'), 'Carnet_de_Discapacidad_Jose_Roca_v2.pdf');
  assert.throws(() => filenameFor('otro', 'Juan', 'archivo.pdf'));
  assert.throws(() => filenameFor('carnet', 'Juan', 'archivo.exe'));
});
test('distingue personas con nombres iguales usando el carnet completo', () => {
  assert.notEqual(folderFor('123456', 'Juan P�rez'), folderFor('654321', 'Juan P�rez'));
  assert.equal(normalizeIdentity(' 12.345-1a '), '123451A');
});
test('valida formato, contenido declarado, tama�o y archivo vac�o', () => {
  assert.equal(validateFile({name:'ci.pdf',type:'application/pdf',size:100}), '');
  assert.ok(validateFile({name:'ci.jpg',type:'text/html',size:100}));
  assert.ok(validateFile({name:'ci.pdf',type:'application/pdf',size:100}, true));
  assert.ok(validateFile({name:'ci.png',type:'image/png',size:6*1024*1024}));
  assert.ok(validateFile({name:'ci.png',type:'image/png',size:0}));
});
test('los datos introducidos no se interpretan como HTML', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('carnet y celular conservan ceros iniciales y eliminan letras y signos pegados', () => {
  assert.equal(digitsOnly('00AB1234-56'), '00123456');
  assert.equal(digitsOnly('+591 700-12345'), '59170012345');
  assert.equal(digitsOnly('1234'), '1234');
  assert.equal(digitsOnly('abc'), '');
});

