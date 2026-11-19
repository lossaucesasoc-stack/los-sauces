# Los Sauces · Registro digital

Primera versión de revisión para la Asociación de Personas con Discapacidad Los Sauces, Monteagudo, Chuquisaca.

## Estado actual

Es una **vista previa funcional, sin conexión a servicios en la nube**. No usar con información real todavía. Los registros y archivos permanecen en memoria en la pestaña; desaparecen al recargar o cerrar la página. El panel de prueba no tiene autenticación. No existe todavía una publicación en GitHub Pages.

Incluye:

- Identidad visual naranja, verde y blanco, con el logo aprobado en el encabezado y la portada.
- Registro por pasos: datos personales, discapacidad, documentos y revisión.
- Campos de la imagen de requisitos: nombre, foto, fecha de nacimiento, CI, carnet de discapacidad, grado, tipo, celular, dirección/comunidad y fecha de afiliación.
- Fotografía personal, carnet de identidad, certificado de nacimiento y carnet de discapacidad.
- Selección de documento completo, anverso o reverso para los documentos.
- Nombres automáticos de archivos por documento y nombre completo de la persona.
- Consulta por carnet numérico. Usar `12345678` para el expediente ficticio.
- Carnet y celular aceptan únicamente números, incluso al pegar texto, conservando los ceros iniciales.
- Teléfono celular de contacto obligatorio (8 a 15 dígitos); puede ser de la persona o de un familiar. También figura en la ficha imprimible.
- Botón **Tomar foto** para la fotografía personal y para cada documento. En teléfonos usa la captura nativa; en computadora solicita acceso a una cámara disponible y permite revisar, repetir o usar la foto. También se puede elegir un archivo.
- Panel administrativo de prueba con búsqueda, filtro de estado, visualización de adjuntos, observaciones e historial temporal.
- Ficha con fotografía, datos, documentación y observaciones, logo en el encabezado y marca de agua tenue.
- Impresión A4: el botón **Imprimir / Guardar PDF** abre la impresión del navegador. Elegir **Guardar como PDF** para obtener un archivo.
- Exportación de listados a CSV compatible con Excel.
- Tamaño de letra ampliable, etiquetas en controles, navegación con teclado y diseño adaptable a celular.

## Abrir en la computadora

Requiere Node.js instalado. Desde la carpeta del proyecto:

```powershell
node tools/serve.mjs
```

Abrir `http://127.0.0.1:4173`. No abrir `index.html` con doble clic porque el navegador puede bloquear los módulos JavaScript desde `file://`.

## Pruebas realizadas

```powershell
node --check web/app.js
node --test tests/domain.test.mjs
```

Se validaron nombres de documentos, separación de carpetas para homónimos, formatos/tamaño de archivos, escape de HTML y tratamiento numérico al pegar texto. Se comprobó por navegador el acceso al expediente, la carga del logo y la marca de agua, los campos numéricos del registro y los botones para tomar fotos. No se accedió a la cámara durante estas pruebas: falta comprobar una captura real en cada dispositivo. La impresión usa las reglas A4 del navegador; falta validar un PDF exportado y realizar las pruebas completas en celular.

## Para conectar el sistema real

1. Crear o elegir un correo de la institución y asegurar sus medios de recuperación. Las contraseñas las introduce el titular; no se incorporan al código.
2. Crear el proyecto **Supabase Free** con esa cuenta. Configurar tablas, permisos y cuentas de administradores.
3. Crear en el Drive de la institución una carpeta privada para expedientes.
4. Implementar y autorizar la conexión de Google Apps Script con Drive; validar permisos en servidor para cada operación. La carga pública se limitará al registro autorizado; la lectura de documentos será administrativa.
5. Conectar registro, consulta y panel a los servicios reales, con validación de archivos y controles contra consultas automatizadas masivas.
6. Completar edición de datos, validación por documento, historial duradero, archivo de expedientes, reemplazo con versiones y exportación a Excel nativo.
7. Confirmar los catálogos de tipo/grado de discapacidad y cuáles campos/requisitos son obligatorios. La lista de documentos procede de la imagen proporcionada; el catálogo de discapacidad es provisional.
8. Revisar la ficha exacta que se mostrará con solo carnet, antes de activar la consulta con datos reales. La consulta por CI no verifica la identidad del visitante.
9. Crear o elegir la cuenta/repositorio de GitHub institucional y publicar los archivos de `web/` en GitHub Pages. Los datos y documentos nunca se guardan en el repositorio.
10. Probar registros simultáneos, acceso de administradores, cargas, consultas, recuperación ante errores, impresiones y copias de seguridad antes de usar expedientes reales.

El objetivo es mantenerse dentro de las cuotas gratuitas. El espacio disponible de Drive depende de lo que ya use la cuenta; los servicios gratuitos tienen límites y no ofrecen capacidad ilimitada.

## Estructura

| Ruta | Contenido |
|---|---|
| `web/` | Página estática para preparar la publicación en GitHub Pages |
| `web/assets/logo-los-sauces.png` | Logo aprobado por la institución |
| `web/domain.mjs` | Catálogos, nombres automáticos y validación inicial |
| `tools/serve.mjs` | Servidor local para revisar la página |
| `tests/` | Pruebas de las reglas de nombres y archivos |
| `PLAN_TECNICO.md` | Diseño de la integración pendiente |

La marca de agua se aplica a las fichas creadas por la aplicación. No modifica las imágenes ni los certificados originales adjuntos.
