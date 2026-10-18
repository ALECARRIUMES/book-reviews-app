# SPEC 02 — Frontend de reseñas de libros

> **Estado:** Aprobada
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-17

## Objetivo

Construir una página web en español que muestre lectores, libros y reseñas desde Supabase y permita registrar una reseña nueva eligiendo lector y libro por su nombre.

## Alcance

**Incluye:**

- Un cliente compartido de Supabase con la clave publicable, leída de variables de entorno de Vite.
- Listado de lectores, de libros (título, autor, género y año) y de reseñas (lector, libro, valoración, comentario y fecha).
- Formulario de nueva reseña con desplegables de lector y libro por nombre, valoración de 1 a 5 y comentario.
- Validación en cliente, aviso preventivo de duplicado y traducción al español de los errores de Supabase.
- Recarga del listado de reseñas tras una inserción correcta.
- Estados de carga, error con reintento, lista vacía y confirmación.
- Diseño responsive y accesible de biblioteca digital, en español, con CSS propio.
- Sustitución de la demo de la plantilla de Vite y eliminación de sus recursos sin uso.

**No incluye (para futuras specs):**

- Autenticación de usuarios.
- Edición o borrado de reseñas (no hay GRANT de `UPDATE` ni `DELETE`).
- Altas, ediciones o bajas de lectores y libros.
- Filtros, búsqueda, ordenación configurable y paginación.
- Router o varias páginas.
- Cambios de esquema, GRANT, RLS, políticas o datos de Supabase (salvo las reseñas que cree la prueba del formulario).
- Pruebas automatizadas y runner de tests.
- Frameworks de interfaz, librerías de componentes o fuentes externas.

## Modelo de datos

### Base de datos

Esta spec **no modifica el esquema**. Reutiliza sin cambios las tablas `readers`, `books` y `reviews` de SPEC 01, con sus restricciones, GRANT, RLS y políticas:

- `anon` puede hacer `SELECT` en las tres tablas.
- `anon` puede hacer `INSERT` solo en `reviews`.
- No hay `UPDATE` ni `DELETE`.

El frontend usa exclusivamente el rol `anon`, con la clave publicable.

### Configuración

| Variable | Origen | Archivo |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto (`https://owltaxxxkrytyefzymxg.supabase.co`) | `.env.local` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable del proyecto | `.env.local` |

- La clave publicable se obtiene con la herramienta MCP de solo lectura `get_publishable_keys`. Si no está disponible, el estudiante la copia del panel de Supabase.
- `.env.local` está ignorado por Git (patrón `*.local` de `.gitignore`).
- `.env.example` se versiona con los mismos nombres y valores de ejemplo no sensibles, por ejemplo `https://tu-proyecto.supabase.co` y `tu-clave-publicable`.
- Nunca se usan `service_role` ni claves secretas (`sb_secret_…`).

### Datos consumidos (supabase-js, sin vistas nuevas)

| Uso | Consulta |
| --- | --- |
| Lectores (listado y desplegable) | `from('readers').select('id, full_name').order('full_name')` |
| Libros (listado y desplegable) | `from('books').select('id, title, author, genre, published_year').order('title')` |
| Reseñas (listado y aviso de duplicado) | `from('reviews').select('id, reader_id, book_id, rating, comment, created_at, readers(full_name), books(title, author)').order('created_at', { ascending: false })` |
| Nueva reseña | `from('reviews').insert({ reader_id, book_id, rating, comment })` |

- Las relaciones embebidas no son ambiguas: hay una sola FK de `reviews` hacia cada tabla.
- El `insert` va **sin** `.select()` (respuesta mínima), así que solo depende del GRANT de `INSERT`. Tras el éxito se vuelve a consultar el listado de reseñas.

Forma de cada reseña recibida:

```js
{ id: 1, reader_id: 1, book_id: 1, rating: 5, comment: '…', created_at: '2026-…', readers: { full_name: '…' }, books: { title: '…', author: '…' } }
```

`reader_id` y `book_id` solo se usan en la lógica interna (aviso preventivo de duplicado). El usuario ve siempre nombres y títulos, en los desplegables y en las tarjetas.

### Estado del formulario y validación en cliente

| Campo | Control | Regla (refleja SPEC 01) |
| --- | --- | --- |
| `reader_id` | `<select>` con `full_name` visible | Obligatorio |
| `book_id` | `<select>` con "Título — Autor" visible | Obligatorio |
| `rating` | 5 radios nativos con forma de estrella, dentro de `fieldset`/`legend` | Obligatorio, entero de 1 a 5 |
| `comment` | `<textarea>` con contador | Recortado (`trim`), de 3 a 1000 caracteres |

- **Aviso preventivo de duplicado:** si el par `(reader_id, book_id)` elegido coincide con el `reader_id` y el `book_id` de alguna reseña cargada por `useLibraryData`, se muestra el aviso y no se envía la petición.
- **Botón de envío:** se desactiva mientras la petición está en curso.

### Traducción de errores (`src/lib/supabaseErrors.js`)

| Código | Mensaje |
| --- | --- |
| `23505` | "Este lector ya ha reseñado este libro." |
| `23503` | "El lector o el libro ya no existe." |
| `23514` | "La valoración o el comentario no cumplen las reglas." |
| `42501` | "No hay permiso para esta operación." |
| Red u otro | "No se pudo conectar con el servidor. Inténtalo de nuevo." |

## Plan de implementación

1. **Configuración.**
   - Crear `.env.local` (clave obtenida con MCP o copiada del panel) y `.env.example`.
   - Crear `src/lib/supabaseClient.js`, con un único `createClient`. Si faltan las variables, exporta un error de configuración que la app muestra, en lugar de romper con la pantalla en blanco.
   - Verificación: `git check-ignore .env.local`, `npm run lint` y `npm run build`.
2. **Estructura base.**
   - `index.html` pasa a `lang="es"`, con título "Reseñas de Libros" y `meta description`.
   - Se reescriben `src/index.css` (tokens de diseño y modo oscuro) y `src/App.css`.
   - `src/App.jsx` muestra la cabecera, la navegación por anclas (Reseñas · Libros · Lectores) y la maquetación.
   - Se eliminan `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg` y `public/icons.svg`; se conserva `public/favicon.svg`.
   - Verificación: lint, build y navegador.
3. **Lectura de datos.**
   - Crear `src/hooks/useLibraryData.js`: carga lectores, libros y reseñas en paralelo, con una bandera de cancelación para StrictMode, y expone `reloadReviews`.
   - Crear `src/components/StatusMessage.jsx`, `ReaderList.jsx`, `BookList.jsx` y `ReviewList.jsx`.
   - Verificación: navegador (CA6, CA7 y CA13).
4. **Formulario.**
   - Crear `src/components/ReviewForm.jsx` con desplegables, estrellas, comentario con contador, validación en cliente y aviso preventivo de duplicado. Todavía no envía nada.
   - Verificación: navegador (CA8 y CA9).
5. **Inserción.**
   - `insert` en `reviews` y `src/lib/supabaseErrors.js`.
   - Confirmación con `role="status"`, limpieza del formulario y `reloadReviews`.
   - Verificación: prueba real (CA10 a CA12).
6. **Pulido.**
   - Responsive a 360, 768 y 1280 px, navegación con teclado, foco visible, contraste y modo oscuro.
   - Repaso final de lint, build y greps.
   - Verificación: CA1 a CA5 y CA14 a CA16.

## Criterios de aceptación

**Validación histórica frente a prueba del frontend.**

- El recuento 4/5/5 de SPEC 01 (CA7) es la validación histórica del momento de su implementación y no se vuelve a exigir.
- Esta spec mide recuentos **relativos**: antes de la prueba, `verificador` registra N = `count(*)` de `reviews` mediante SELECT; después se espera N + 1.
- La reseña de prueba (Marcos Ibáñez Ruiz + Raíces de sal) permanece en Supabase. No se borra ningún registro ni se restaura el recuento.

Criterios:

- [ ] CA1 — `npm run lint` termina con 0 errores. Verificación: prueba técnica.
- [ ] CA2 — `npm run build` termina con éxito. Verificación: prueba técnica.
- [ ] CA3 — `.env.local` está ignorado y no está versionado; `.env.example` sí está versionado y solo contiene valores de ejemplo. Verificación: `git check-ignore .env.local`, `git ls-files` y lectura de `.env.example`.
- [ ] CA4 — `src/`, `.env.example` y `dist/` no contienen `service_role` ni `sb_secret_`. El código no contiene la URL ni la clave escritas a mano, sino que las lee de `import.meta.env`. Verificación: grep.
- [ ] CA5 — Hay un único `createClient`, en `src/lib/supabaseClient.js`. Verificación: grep en `src/`.
- [ ] CA6 — La página muestra los 4 lectores y los 5 libros, cada libro con título, autor, género y año. Verificación: navegador.
- [ ] CA7 — La página muestra N reseñas, cada una con nombre del lector, título del libro, estrellas y comentario, y N coincide con el `count(*)` que obtiene `verificador`. Verificación: navegador y SQL de solo lectura.
- [ ] CA8 — Los desplegables muestran nombres y títulos, nunca IDs, y no hay ningún campo para escribir un ID. Verificación: navegador.
- [ ] CA9 — Al enviar el formulario vacío, o con un comentario de menos de 3 caracteres tras recortar espacios, aparecen mensajes en español y no sale ninguna petición. Verificación: navegador (pestaña Network).
- [ ] CA10 — Al publicar Marcos Ibáñez Ruiz + Raíces de sal con valoración y comentario válidos:
  - aparece la confirmación;
  - la reseña sale primera en el listado sin recargar la página;
  - `count(*)` de `reviews` pasa de N a N + 1.

  Verificación: navegador y SQL de solo lectura de `verificador`.
- [ ] CA11 — Duplicados:
  - **(a) Aviso preventivo.** Con Lucía Fernández Ortega + El faro de las horas quietas aparece "Este lector ya ha reseñado este libro." y no sale ninguna petición.
  - **(b) Error del servidor.** Una segunda pestaña, abierta antes de CA10, envía después el mismo par de CA10. Aparece el mismo mensaje, traducido del error `23505`.

  En ambos casos el recuento no cambia. Verificación: navegador y SQL de solo lectura.
- [ ] CA12 — Mientras se envía, el botón está desactivado, y un doble clic no crea dos reseñas. Verificación: navegador y recuento en CA10.
- [ ] CA13 — Con la red cortada (DevTools, modo offline), cada sección muestra un error y "Reintentar"; al recuperar la red y pulsarlo, los datos cargan. Verificación: navegador.
- [ ] CA14 — Hay estados de carga visibles al iniciar y estados vacíos con texto definido en cada listado. Verificación: navegador para la carga y revisión del código para los vacíos, sin borrar datos para provocarlos.
- [ ] CA15 — A 360 px no hay scroll horizontal y el formulario y los listados se usan en una sola columna; desde 960 px, el formulario y las reseñas van en dos columnas. Verificación: navegador (modo responsive de DevTools).
- [ ] CA16 — Accesibilidad e idioma:
  - el formulario se completa solo con teclado y con foco visible;
  - cada campo tiene su etiqueta asociada;
  - los mensajes usan `aria-live`;
  - la página es `lang="es"`;
  - no queda texto ni recursos de la demo de la plantilla.

  Verificación: navegador y revisión del código.

Las pruebas de navegador las realiza el estudiante con apoyo de OLIVER. `verificador` ejecuta lint, build y los SELECT de recuento. `revisor-spec` contrasta al final cada criterio con el código.

## Decisiones tomadas y descartadas

- **Sí:** reutilizar el esquema, los GRANT y la RLS de SPEC 01 sin cambios. El frontend solo necesita `SELECT` e `INSERT` en `reviews`. (Aprobada previamente.)
- **Sí:** CSS propio con custom properties, estética de biblioteca digital y modo oscuro. Cero dependencias y código legible para el laboratorio. (Aprobada previamente.)
- **No:** Tailwind ni librerías de componentes. Exigen instalación y configuración sin una necesidad técnica.
- **Sí:** un hook central `useLibraryData` en `App`. Lectores y libros alimentan a la vez los listados y los desplegables; así se evitan peticiones duplicadas y estados incoherentes. (Aprobada previamente.)
- **No:** que cada componente consulte por su cuenta. Duplica peticiones y estados de carga.
- **Sí:** volver a consultar las reseñas tras insertar, con un `insert` sin `.select()`. La base de datos es la fuente de verdad para el orden, `created_at` y los nombres embebidos. (Aprobada previamente.)
- **No:** añadir la fila en local con `insert().select()`. Duplicaría la lógica de presentación y dependería de `RETURNING`.
- **Sí:** aviso preventivo de duplicado en cliente y error `23505` del servidor como autoridad. El aviso ahorra una petición inútil; el error del servidor cubre otras pestañas u otros usuarios. (Aprobada previamente.)
- **Sí:** página única con navegación por anclas. Tres secciones no justifican un router. (Aprobada previamente.)
- **No:** `react-router` ni pestañas. Una dependencia más, o contenido oculto, sin beneficio.
- **Sí:** valoración con radios nativos con forma de estrellas. Accesibles por defecto, con flechas de teclado. (Aprobada previamente.)
- **No:** `select` numérico ni un componente de estrellas de terceros. Menos claro, o una dependencia más.
- **Sí:** un único cliente en `src/lib/supabaseClient.js` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` desde `.env.local`. Así lo exige `CLAUDE.md`. (Aprobada previamente.)
- **Sí:** obtener la clave publicable con MCP de solo lectura y guardarla solo en `.env.local`. Nunca `service_role` ni claves secretas. (Aprobada previamente.)
- **Sí:** `.env.example` versionado con nombres de variables y valores de ejemplo no sensibles. Documenta la configuración sin exponer nada. (Aprobada previamente; prevalece sobre la idea del plan de dejar valores vacíos.)
- **Sí:** eliminar solo los recursos sin uso de la plantilla (`hero.png`, `react.svg`, `vite.svg`, `icons.svg`). `favicon.svg` se conserva porque se usa. (Aprobada previamente.)
- **Sí:** prueba real de inserción con Marcos Ibáñez Ruiz + Raíces de sal; la reseña permanece en Supabase. (Aprobada previamente.)
- **Sí:** recuentos relativos (N → N + 1) en vez de exigir 4/5/5. El 4/5/5 es la validación histórica de SPEC 01. (Aprobada previamente.)
- **Sí:** el estudiante realiza las pruebas de navegador con apoyo de OLIVER. (Aprobada previamente.)
- **Sí:** cada componente en su propio archivo, exportando solo componentes; hooks y utilidades en `src/hooks` y `src/lib`. Lo exige `react/only-export-components` para que Fast Refresh funcione.
- **No:** paginación. `UNIQUE (reader_id, book_id)` limita las reseñas a 20 (4 lectores × 5 libros).

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La Data API no expone el esquema `public` y las consultas REST fallan. CA14 de SPEC 01 se comprobó por SQL, no por REST. | El paso 3 lo detecta enseguida. El error se muestra con "Reintentar" y no se cambia la configuración de Supabase sin aprobación. |
| Faltan las variables de entorno y la app se queda en blanco. | `supabaseClient.js` exporta un error de configuración que la app muestra en español. |
| La clave publicable acaba en el bundle de `dist/`. | Es pública por diseño. `dist/` está ignorado y CA4 comprueba que no hay claves secretas. |
| StrictMode duplica efectos y cargas en desarrollo. | Bandera de cancelación en el efecto de `useLibraryData`; es inofensivo en producción. |
| Doble envío del formulario. | El botón se desactiva durante el envío y `UNIQUE (reader_id, book_id)` actúa como red de seguridad (CA12). |
| Las reseñas de prueba alteran los recuentos de SPEC 01. | Aceptado: se miden recuentos relativos y `CLAUDE.md` registra que el 4/5/5 es histórico. |
| El `INSERT` anónimo abierto permite reseñas sin identificar. | Riesgo ya aceptado en SPEC 01; no se reabre aquí. |

## Qué no incluye esta spec

- Autenticación, edición o borrado de reseñas.
- Gestión de lectores o libros.
- Cambios en Supabase (esquema, GRANT, RLS o políticas).
- Dependencias nuevas, router o pruebas automatizadas.
