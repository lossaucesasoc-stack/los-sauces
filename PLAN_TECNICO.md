# Integración prevista

## Servicios

| Componente | Elección |
|---|---|
| Página pública | HTML, CSS y JavaScript estáticos en GitHub Pages |
| Base de datos | PostgreSQL en Supabase Free |
| Identidad administrativa | Supabase Auth |
| Archivos | Drive de una cuenta institucional |
| Conexión con Drive | Google Apps Script ejecutado por la cuenta propietaria, con validación de cada operación |

La integración todavía no está implementada. En particular, no se ha validado la comunicación entre GitHub Pages y Apps Script ni el flujo de archivos privados. Antes de finalizar la arquitectura se debe probar el transporte entre orígenes, la autorización administrativa y el tamaño/tiempo de carga. No deben usarse carpetas públicas para evitar esas comprobaciones.

## Modelo de datos previsto

| Entidad | Datos principales |
|---|---|
| Persona | ID interno, número completo de CI normalizado, nombres, fecha de nacimiento, teléfono, dirección/comunidad, persona de apoyo |
| Afiliación | Persona, código de registro, fecha de afiliación, estado del expediente |
| Discapacidad | Persona, número de carnet, tipo, grado y porcentaje cuando corresponda |
| Documento | Persona, tipo, lado, nombre, ID de Drive, tamaño, MIME, versión, estado de revisión, fechas |
| Observación | Persona/documento, texto, visibilidad, autor y fecha |
| Administrador | Usuario de Supabase, rol, estado activo |
| Historial | Autor, operación, expediente/documento, fecha y cambios relevantes |

La interfaz actual pide solo los dígitos del CI, según la última indicación del titular. Antes de activar datos reales se debe definir cómo distinguir eventuales documentos con igual número y diferente complemento. El administrador podrá corregir registros con trazabilidad. Una persona registrada por un administrador seguirá teniendo un solo expediente.

## Archivos

Cada expediente se identifica con un ID interno estable y una carpeta rotulada con CI y nombre. La relación se guarda por ID de Drive, sin depender únicamente del nombre del archivo.

Ejemplos de nombres:

| Tipo | Archivo |
|---|---|
| Fotografía | `Foto_Maria_Perez_Lopez.jpg` |
| CI anverso | `Carnet_Maria_Perez_Lopez_Anverso.jpg` |
| CI reverso | `Carnet_Maria_Perez_Lopez_Reverso.jpg` |
| Certificado de nacimiento | `Certificado_de_Nacimiento_Maria_Perez_Lopez.pdf` |
| Carnet de discapacidad | `Carnet_de_Discapacidad_Maria_Perez_Lopez.jpg` |

Los reemplazos conservarán la versión anterior y se distinguirán con sufijo de versión/fecha. El servidor asignará los nombres definitivos, verificará el contenido real y limitará los tamaños. La validación JavaScript del prototipo es solo una ayuda inicial.

## Consulta y acceso

- El usuario pidió consulta de su ficha por CI, sin PIN ni correo. No equivaldrá a autenticación y no dará capacidad de editar registros existentes.
- La consulta devolverá únicamente los campos expresamente definidos para la ficha; nunca un listado completo de personas ni IDs directos de documentos privados.
- Los administradores iniciarán sesión para consultar documentos, editar y revisar expedientes.
- La autorización se verificará en la base de datos y en el servidor que acceda a Drive. Ocultar botones no constituye control de acceso.
- Las claves de servicio, autorizaciones de Drive y secretos de servidor no se incluirán en la página, el repositorio ni la configuración descargable.
- Se implementarán límites de consulta/carga y prevención de duplicados, con recuperación de archivos huérfanos si falla una operación.

## Documentos emitidos

Una misma plantilla para consulta e impresión administrativa. Logo visible en el encabezado y marca de agua con opacidad aproximada del 6 %, con tamaño y contraste revisados en A4. Incluirá fotografía, datos personales, afiliación, información de discapacidad, estado, requisitos y observaciones.

El prototipo abre el diálogo de impresión para guardar PDF. La versión definitiva debe validar el formato y la paginación con expedientes completos y texto largo. Si se añade una generación de PDF distinta, debe reutilizar el mismo logo y diseño.

## Próximo paso del titular

Preparar el correo institucional y comunicar solamente su dirección. Después podrá iniciar sesión personalmente en Google, Supabase y GitHub cuando corresponda. No debe enviar contraseñas, códigos de recuperación ni tokens por el chat.
