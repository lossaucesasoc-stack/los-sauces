# Integraci�n prevista

## Servicios

| Componente | Elecci�n |
|---|---|
| P�gina p�blica | HTML, CSS y JavaScript est�ticos en GitHub Pages |
| Base de datos | PostgreSQL en Supabase Free |
| Identidad administrativa | Supabase Auth |
| Archivos | Drive de una cuenta institucional |
| Conexi�n con Drive | Google Apps Script ejecutado por la cuenta propietaria, con validaci�n de cada operaci�n |

La integraci�n todav�a no est� implementada. En particular, no se ha validado la comunicaci�n entre GitHub Pages y Apps Script ni el flujo de archivos privados. Antes de finalizar la arquitectura se debe probar el transporte entre or�genes, la autorizaci�n administrativa y el tama�o/tiempo de carga. No deben usarse carpetas p�blicas para evitar esas comprobaciones.

## Modelo de datos previsto

| Entidad | Datos principales |
|---|---|
| Persona | ID interno, n�mero completo de CI normalizado, nombres, fecha de nacimiento, tel�fono, direcci�n/comunidad, persona de apoyo |
| Afiliaci�n | Persona, c�digo de registro, fecha de afiliaci�n, estado del expediente |
| Discapacidad | Persona, n�mero de carnet, tipo, grado y porcentaje cuando corresponda |
| Documento | Persona, tipo, lado, nombre, ID de Drive, tama�o, MIME, versi�n, estado de revisi�n, fechas |
| Observaci�n | Persona/documento, texto, visibilidad, autor y fecha |
| Administrador | Usuario de Supabase, rol, estado activo |
| Historial | Autor, operaci�n, expediente/documento, fecha y cambios relevantes |

La interfaz actual pide solo los d�gitos del CI, seg�n la �ltima indicaci�n del titular. Antes de activar datos reales se debe definir c�mo distinguir eventuales documentos con igual n�mero y diferente complemento. El administrador podr� corregir registros con trazabilidad. Una persona registrada por un administrador seguir� teniendo un solo expediente.

## Archivos

Cada expediente se identifica con un ID interno estable y una carpeta rotulada con CI y nombre. La relaci�n se guarda por ID de Drive, sin depender �nicamente del nombre del archivo.

Ejemplos de nombres:

| Tipo | Archivo |
|---|---|
| Fotograf�a | `Foto_Maria_Perez_Lopez.jpg` |
| CI anverso | `Carnet_Maria_Perez_Lopez_Anverso.jpg` |
| CI reverso | `Carnet_Maria_Perez_Lopez_Reverso.jpg` |
| Certificado de nacimiento | `Certificado_de_Nacimiento_Maria_Perez_Lopez.pdf` |
| Carnet de discapacidad | `Carnet_de_Discapacidad_Maria_Perez_Lopez.jpg` |

Los reemplazos conservar�n la versi�n anterior y se distinguir�n con sufijo de versi�n/fecha. El servidor asignar� los nombres definitivos, verificar� el contenido real y limitar� los tama�os. La validaci�n JavaScript del prototipo es solo una ayuda inicial.

## Consulta y acceso

- El usuario pidi� consulta de su ficha por CI, sin PIN ni correo. No equivaldr� a autenticaci�n y no dar� capacidad de editar registros existentes.
- La consulta devolver� �nicamente los campos expresamente definidos para la ficha; nunca un listado completo de personas ni IDs directos de documentos privados.
- Los administradores iniciar�n sesi�n para consultar documentos, editar y revisar expedientes.
- La autorizaci�n se verificar� en la base de datos y en el servidor que acceda a Drive. Ocultar botones no constituye control de acceso.
- Las claves de servicio, autorizaciones de Drive y secretos de servidor no se incluir�n en la p�gina, el repositorio ni la configuraci�n descargable.
- Se implementar�n l�mites de consulta/carga y prevenci�n de duplicados, con recuperaci�n de archivos hu�rfanos si falla una operaci�n.

## Documentos emitidos

Una misma plantilla para consulta e impresi�n administrativa. Logo visible en el encabezado y marca de agua con opacidad aproximada del 6 %, con tama�o y contraste revisados en A4. Incluir� fotograf�a, datos personales, afiliaci�n, informaci�n de discapacidad, estado, requisitos y observaciones.

El prototipo abre el di�logo de impresi�n para guardar PDF. La versi�n definitiva debe validar el formato y la paginaci�n con expedientes completos y texto largo. Si se a�ade una generaci�n de PDF distinta, debe reutilizar el mismo logo y dise�o.

## Pr�ximo paso del titular

Preparar el correo institucional y comunicar solamente su direcci�n. Despu�s podr� iniciar sesi�n personalmente en Google, Supabase y GitHub cuando corresponda. No debe enviar contrase�as, c�digos de recuperaci�n ni tokens por el chat.

