# Los Sauces � Registro digital

Primera versi�n de revisi�n para la Asociaci�n de Personas con Discapacidad Los Sauces, Monteagudo, Chuquisaca.

## Estado actual

Es una **vista previa funcional, sin conexi�n a servicios en la nube**. No usar con informaci�n real todav�a. Los registros y archivos permanecen en memoria en la pesta�a; desaparecen al recargar o cerrar la p�gina. El panel de prueba no tiene autenticaci�n. No existe todav�a una publicaci�n en GitHub Pages.

Incluye:

- Identidad visual naranja, verde y blanco, con el logo aprobado en el encabezado y la portada.
- Registro por pasos: datos personales, discapacidad, documentos y revisi�n.
- Campos de la imagen de requisitos: nombre, foto, fecha de nacimiento, CI, carnet de discapacidad, grado, tipo, celular, direcci�n/comunidad y fecha de afiliaci�n.
- Fotograf�a personal, carnet de identidad, certificado de nacimiento y carnet de discapacidad.
- Selecci�n de documento completo, anverso o reverso para los documentos.
- Nombres autom�ticos de archivos por documento y nombre completo de la persona.
- Consulta por carnet num�rico. Usar `12345678` para el expediente ficticio.
- Carnet y celular aceptan �nicamente n�meros, incluso al pegar texto, conservando los ceros iniciales.
- Tel�fono celular de contacto obligatorio (8 a 15 d�gitos); puede ser de la persona o de un familiar. Tambi�n figura en la ficha imprimible.
- Bot�n **Tomar foto** para la fotograf�a personal y para cada documento. En tel�fonos usa la captura nativa; en computadora solicita acceso a una c�mara disponible y permite revisar, repetir o usar la foto. Tambi�n se puede elegir un archivo.
- Panel administrativo de prueba con b�squeda, filtro de estado, visualizaci�n de adjuntos, observaciones e historial temporal.
- Ficha con fotograf�a, datos, documentaci�n y observaciones, logo en el encabezado y marca de agua tenue.
- Impresi�n A4: el bot�n **Imprimir / Guardar PDF** abre la impresi�n del navegador. Elegir **Guardar como PDF** para obtener un archivo.
- Exportaci�n de listados a CSV compatible con Excel.
- Tama�o de letra ampliable, etiquetas en controles, navegaci�n con teclado y dise�o adaptable a celular.

## Abrir en la computadora

Requiere Node.js instalado. Desde la carpeta del proyecto:

```powershell
node tools/serve.mjs
```

Abrir `http://127.0.0.1:4173`. No abrir `index.html` con doble clic porque el navegador puede bloquear los m�dulos JavaScript desde `file://`.

## Pruebas realizadas

```powershell
node --check web/app.js
node --test tests/domain.test.mjs
```

Se validaron nombres de documentos, separaci�n de carpetas para hom�nimos, formatos/tama�o de archivos, escape de HTML y tratamiento num�rico al pegar texto. Se comprob� por navegador el acceso al expediente, la carga del logo y la marca de agua, los campos num�ricos del registro y los botones para tomar fotos. No se accedi� a la c�mara durante estas pruebas: falta comprobar una captura real en cada dispositivo. La impresi�n usa las reglas A4 del navegador; falta validar un PDF exportado y realizar las pruebas completas en celular.

## Para conectar el sistema real

1. Crear o elegir un correo de la instituci�n y asegurar sus medios de recuperaci�n. Las contrase�as las introduce el titular; no se incorporan al c�digo.
2. Crear el proyecto **Supabase Free** con esa cuenta. Configurar tablas, permisos y cuentas de administradores.
3. Crear en el Drive de la instituci�n una carpeta privada para expedientes.
4. Implementar y autorizar la conexi�n de Google Apps Script con Drive; validar permisos en servidor para cada operaci�n. La carga p�blica se limitar� al registro autorizado; la lectura de documentos ser� administrativa.
5. Conectar registro, consulta y panel a los servicios reales, con validaci�n de archivos y controles contra consultas automatizadas masivas.
6. Completar edici�n de datos, validaci�n por documento, historial duradero, archivo de expedientes, reemplazo con versiones y exportaci�n a Excel nativo.
7. Confirmar los cat�logos de tipo/grado de discapacidad y cu�les campos/requisitos son obligatorios. La lista de documentos procede de la imagen proporcionada; el cat�logo de discapacidad es provisional.
8. Revisar la ficha exacta que se mostrar� con solo carnet, antes de activar la consulta con datos reales. La consulta por CI no verifica la identidad del visitante.
9. Crear o elegir la cuenta/repositorio de GitHub institucional y publicar los archivos de `web/` en GitHub Pages. Los datos y documentos nunca se guardan en el repositorio.
10. Probar registros simult�neos, acceso de administradores, cargas, consultas, recuperaci�n ante errores, impresiones y copias de seguridad antes de usar expedientes reales.

El objetivo es mantenerse dentro de las cuotas gratuitas. El espacio disponible de Drive depende de lo que ya use la cuenta; los servicios gratuitos tienen l�mites y no ofrecen capacidad ilimitada.

## Estructura

| Ruta | Contenido |
|---|---|
| `web/` | P�gina est�tica para preparar la publicaci�n en GitHub Pages |
| `web/assets/logo-los-sauces.png` | Logo aprobado por la instituci�n |
| `web/domain.mjs` | Cat�logos, nombres autom�ticos y validaci�n inicial |
| `tools/serve.mjs` | Servidor local para revisar la p�gina |
| `tests/` | Pruebas de las reglas de nombres y archivos |
| `PLAN_TECNICO.md` | Dise�o de la integraci�n pendiente |

La marca de agua se aplica a las fichas creadas por la aplicaci�n. No modifica las im�genes ni los certificados originales adjuntos.

