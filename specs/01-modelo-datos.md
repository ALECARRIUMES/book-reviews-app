# SPEC 01 — Modelo de datos de reseñas de libros

> **Estado:** Aprobada
> **Depende de:** Ninguna
> **Fecha:** 2026-10-17

## Objetivo

Crear en Supabase las tablas `readers`, `books` y `reviews` con integridad referencial, permisos mínimos, RLS y datos de ejemplo ficticios.

## Alcance

**Incluye:**

- Las tablas `readers`, `books` y `reviews` en el esquema `public`, con sus PK, FK, CHECK y UNIQUE.
- Los GRANT para `anon` y `authenticated`: `SELECT` en las tres tablas e `INSERT` solo en `reviews`.
- RLS habilitado en las tres tablas, con cuatro políticas.
- Datos de ejemplo ficticios: 4 lectores, 5 libros y 5 reseñas.
- Las consultas SQL de verificación de los criterios de aceptación.

**No incluye (para futuras specs):**

- Código del frontend: cliente de Supabase, listados, formulario de reseñas y desplegables por nombre.
- Autenticación de usuarios y vínculo entre una cuenta y un lector.
- Altas, ediciones o borrados de lectores y libros desde la aplicación.
- Edición o borrado de reseñas desde la aplicación.
- Vistas, funciones, triggers o columnas calculadas (por ejemplo, la nota media por libro).
- Correo electrónico u otros datos de contacto de los lectores.
- Archivos de migración en el repositorio.

## Modelo de datos

### Tabla `readers`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| id | bigint generated always as identity | PK |
| full_name | text | NOT NULL, UNIQUE, CHECK (length(trim(full_name)) BETWEEN 2 AND 100) |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### Tabla `books`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| id | bigint generated always as identity | PK |
| title | text | NOT NULL, CHECK (length(trim(title)) BETWEEN 1 AND 200) |
| author | text | NOT NULL, CHECK (length(trim(author)) BETWEEN 2 AND 100) |
| published_year | smallint | Admite NULL, CHECK (published_year BETWEEN 1450 AND 2100) |
| genre | text | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Restricción de tabla: `UNIQUE (title, author)`.

### Tabla `reviews`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| id | bigint generated always as identity | PK |
| reader_id | bigint | NOT NULL, FK → readers(id) ON DELETE RESTRICT |
| book_id | bigint | NOT NULL, FK → books(id) ON DELETE RESTRICT |
| rating | smallint | NOT NULL, CHECK (rating BETWEEN 1 AND 5) |
| comment | text | NOT NULL, CHECK (length(trim(comment)) BETWEEN 3 AND 1000) |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Restricción de tabla: `UNIQUE (reader_id, book_id)`. Un lector solo puede reseñar un libro una vez.

### Relaciones

- `readers` 1 — N `reviews` (por `reviews.reader_id`).
- `books` 1 — N `reviews` (por `reviews.book_id`).
- Con `ON DELETE RESTRICT` no se puede borrar un lector ni un libro que tenga reseñas.

### Permisos (GRANT)

- `SELECT` en `readers`, `books` y `reviews` para `anon` y `authenticated`.
- `INSERT` en `reviews` para `anon` y `authenticated`.
- Ningún otro privilegio de tabla para esos roles: ni `UPDATE`, ni `DELETE`, ni `TRUNCATE`, `REFERENCES` o `TRIGGER`.
- Si los privilegios por defecto de Supabase conceden algo más a esos roles sobre las tablas nuevas, se revocan expresamente. Lo que se comprueba es el resultado final de `has_table_privilege`, no el GRANT ejecutado.
- No hace falta conceder permisos sobre secuencias, porque las PK son `identity`. El `USAGE` sobre el esquema `public` se comprueba, no se supone.

### RLS y políticas

- `ENABLE ROW LEVEL SECURITY` en las tres tablas.
- Cuatro políticas:

| Tabla | Operación | Roles | Expresión |
| --- | --- | --- | --- |
| readers | SELECT | anon, authenticated | USING (true) |
| books | SELECT | anon, authenticated | USING (true) |
| reviews | SELECT | anon, authenticated | USING (true) |
| reviews | INSERT | anon, authenticated | WITH CHECK (true) |

La política `INSERT` de `reviews` es deliberadamente abierta. Su riesgo se documenta en **Riesgos identificados**.

### Datos de ejemplo (ficticios)

- **readers (4):** Lucía Fernández Ortega, Marcos Ibáñez Ruiz, Valeria Soto Medina y Tomás Aguilar Peña.
- **books (5):**

| title | author | published_year | genre |
| --- | --- | --- | --- |
| El faro de las horas quietas | Inés Calderón | 2018 | Novela |
| Cartografía del silencio | Rubén Olmedo | 2021 | Ensayo |
| La biblioteca bajo la lluvia | Clara Montes | 2015 | Fantasía |
| Ecuaciones para un verano | Diego Valverde | 2019 | Ciencia ficción |
| Raíces de sal | Paula Herrera | 2023 | Poesía |

- **reviews (5):** cinco pares distintos de lector y libro. Cada lector tiene al menos una reseña y cada libro exactamente una.

| # | Lector (`full_name`) | Libro (`title`) | rating | comment |
| --- | --- | --- | --- | --- |
| 1 | Lucía Fernández Ortega | El faro de las horas quietas | 5 | Una novela serena que atrapa desde el primer capítulo. |
| 2 | Marcos Ibáñez Ruiz | Cartografía del silencio | 3 | Ensayo interesante, aunque algunos capítulos se repiten. |
| 3 | Valeria Soto Medina | La biblioteca bajo la lluvia | 4 | Un mundo fantástico lleno de detalles y personajes entrañables. |
| 4 | Tomás Aguilar Peña | Ecuaciones para un verano | 2 | La premisa es buena, pero el final se queda corto. |
| 5 | Lucía Fernández Ortega | Raíces de sal | 4 | Poemas breves con imágenes del mar muy evocadoras. |

  Todos los `rating` están entre 2 y 5. Todos los `comment` tienen entre 3 y 1000 caracteres y no contienen comillas simples, así que se insertan sin escapar.
- Las FK de la semilla se resuelven con subconsultas por nombre y título, por ejemplo `(SELECT id FROM readers WHERE full_name = '…')`. No se usan IDs fijos.
- Orden de inserción: `readers` → `books` → `reviews`.

### Estructuras que consumirá el frontend (referencia para specs futuras)

- Desplegables: `readers(id, full_name)` y `books(id, title, author)`. El usuario elige por nombre y la app envía los IDs; nadie escribe un ID a mano.
- Listado: select embebido de supabase-js, sin vistas:

```js
supabase.from('reviews').select('id, rating, comment, created_at, readers(full_name), books(title, author)')
```

## Plan de implementación

Requisito previo: el estudiante revisa esta spec y cambia su estado a `Aprobada`. El subagente `arquitecto-bd` no actúa sin ese estado.

1. **Crear las tablas.** Migración `create_book_reviews_tables`: las tres tablas con PK, FK, CHECK y UNIQUE. Verificación: `list_tables` muestra `readers`, `books` y `reviews` con sus columnas.
2. **Permisos y RLS.** Migración `grant_and_rls_book_reviews`:
   - revocar los privilegios de tabla que sobren para `anon` y `authenticated`;
   - conceder los GRANT definidos;
   - habilitar RLS y crear las cuatro políticas.

   Verificación: consultas sobre `has_table_privilege`, `pg_class.relrowsecurity` y `pg_policies`.
3. **Datos de ejemplo.** Insertar la semilla con `execute_sql` en el orden `readers` → `books` → `reviews`, resolviendo las FK por nombre. Verificación: recuentos 4/5/5 y `list_tables` final.

Ninguna sentencia del plan usa `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE` ni `DELETE` sin `WHERE`, que bloquea el hook `guardian-bd.js`.

## Criterios de aceptación

Los permisos se verifican en tres niveles distintos, y uno no sustituye a otro:

- **Privilegios configurados** (CA9): qué GRANT tienen `anon` y `authenticated`, consultados desde un rol administrativo.
- **Políticas RLS existentes** (CA10): qué políticas hay en el catálogo, consultadas desde un rol administrativo.
- **Acceso efectivo comprobado** (CA14): qué filas ve realmente una sesión que actúa como `anon`, con GRANT y RLS aplicados a la vez.

- [ ] CA1 — Existen exactamente las tablas `readers`, `books` y `reviews` en `public`. Verificación: SQL sobre `information_schema.tables` con `table_schema = 'public'`.
- [ ] CA2 — `readers` no tiene columna `email`. Verificación: SQL sobre `information_schema.columns` → 0 filas para `table_name = 'readers' AND column_name = 'email'`.
- [ ] CA3 — Cada tabla tiene PK sobre `id` de tipo `bigint` identity. Verificación: SQL sobre `pg_constraint` (`contype = 'p'`, 3 filas) e `information_schema.columns` (`is_identity = 'YES'`).
- [ ] CA4 — `reviews` tiene dos FK, hacia `readers` y hacia `books`, ambas con `ON DELETE RESTRICT`. Verificación: SQL sobre `pg_constraint` con `contype = 'f'` y `conrelid = 'public.reviews'::regclass` → 2 filas con `confdeltype = 'r'`.
- [ ] CA5 — Existen las restricciones UNIQUE `readers(full_name)`, `books(title, author)` y `reviews(reader_id, book_id)`. Verificación: SQL sobre `pg_constraint` con `contype = 'u'` → 3 filas.
- [ ] CA6 — Existen los CHECK de `full_name`, `title`, `author`, `published_year`, `rating` y `comment`. Verificación: SQL sobre `pg_constraint` con `contype = 'c'` y `pg_get_constraintdef`.
- [ ] CA7 — Recuentos de la semilla: `readers` = 4, `books` = 5, `reviews` = 5. Verificación: SQL con `count(*)` por tabla.
- [ ] CA8 — No hay reseñas huérfanas. Verificación: SQL con `LEFT JOIN` de `reviews` a `readers` y a `books`, filtrando padres nulos → 0 filas.
- [ ] CA9 — Privilegios configurados correctos para `anon` y `authenticated`. Verificación: SQL administrativo con `has_table_privilege`:
  - `SELECT` = true en las tres tablas.
  - `INSERT` = true solo en `reviews`.
  - `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` y `TRIGGER` = false en las tres tablas.
- [ ] CA10 — RLS habilitado y exactamente cuatro políticas. Verificación: SQL sobre `pg_class.relrowsecurity` (true en las tres tablas) y `pg_policies`: 3 de `SELECT` y 1 de `INSERT` en `reviews`, todas para `anon` y `authenticated`.
- [ ] CA11 — Consulta por nombres. Verificación: SQL con `JOIN` de `reviews`, `readers` y `books` que devuelve `full_name`, `title`, `rating` y `comment`. Deben salir exactamente las 5 reseñas de la tabla de datos de ejemplo, con sus pares, ratings y comentarios.
- [ ] CA12 — Las restricciones rechazan datos inválidos y no queda ningún dato. Verificación: prueba manual del estudiante en el SQL Editor, porque `verificador` solo ejecuta `SELECT`. Cada caso va en su propia transacción (`BEGIN; … ROLLBACK;`) o tras un `SAVEPOINT` con `ROLLBACK TO SAVEPOINT`; así un error no aborta los casos siguientes. Deben fallar:
  - `rating = 6`;
  - una reseña duplicada para un par existente;
  - un `reader_id` inexistente;
  - un `DELETE` de un lector que tiene reseñas.

  Al terminar, el recuento sigue siendo 4/5/5.
- [ ] CA13 — Panel de Supabase. Verificación: el Table Editor muestra las tres tablas con sus datos y las relaciones de `reviews`. En el Security Advisor no aparece la alerta "RLS disabled in public" para estas tablas. Otros avisos no invalidan el criterio, por ejemplo uno por política permisiva en el `INSERT` de `reviews`. Se anotan y se revisan.
- [ ] CA14 — Acceso efectivo de lectura como `anon`. `anon` lee las tres tablas con GRANT y RLS aplicados: 4 filas en `readers`, 5 en `books` y 5 en `reviews`. Verificación: SQL de solo lectura en una transacción que termina con `ROLLBACK`:

  ```sql
  BEGIN;
  SET LOCAL ROLE anon;
  SELECT current_user;  -- debe devolver anon
  SELECT (SELECT count(*) FROM public.readers) AS readers,
         (SELECT count(*) FROM public.books)   AS books,
         (SELECT count(*) FROM public.reviews) AS reviews;
  ROLLBACK;
  ```

  Interpretación:
  - Cumple si `current_user` es `anon` y los recuentos son 4/5/5.
  - No cumple si aparece `permission denied`: falta un GRANT.
  - No cumple si algún recuento es 0, aunque no haya error: el acceso efectivo falla y requiere diagnóstico. No se atribuye automáticamente a una política RLS faltante. Puede deberse a la política, a la semilla o a otra causa; se contrasta con CA7 y CA10 antes de concluir.

  La consulta no escribe datos y el `ROLLBACK` deshace el cambio de rol. Puede ejecutarla el estudiante en el SQL Editor, o `verificador` si sus reglas permiten `SET LOCAL ROLE`. Si el entorno no permite ejecutarla (por ejemplo, el rol de la sesión no puede asumir `anon`, o la herramienta solo acepta `SELECT` sueltos), el criterio se marca **No verificado** y se anota el motivo o el error literal. No se deduce su resultado de CA9 ni de CA10.

## Decisiones tomadas y descartadas

- **Sí:** tres tablas `readers`, `books` y `reviews`. Es el modelo mínimo que permite reseñar libros por lector. (Aprobada previamente.)
- **Sí:** PK `bigint generated always as identity`. Es estándar SQL, legible en clase y no requiere GRANT sobre secuencias. (Aprobada previamente.)
- **No:** `uuid` o `serial`. UUID no aporta nada sin autenticación ni sistemas distribuidos; `serial` es la forma antigua y necesita permisos sobre la secuencia.
- **Sí:** FK con `ON DELETE RESTRICT`. Impide perder reseñas al borrar un lector o un libro. (Aprobada previamente.)
- **No:** `ON DELETE CASCADE`. Borraría reseñas en silencio.
- **Sí:** `UNIQUE (reader_id, book_id)`. Modela una opinión por lector y libro, y añade una restricción verificable. (Aprobada previamente.)
- **Sí:** `UNIQUE (full_name)` en `readers` y `UNIQUE (title, author)` en `books`. La selección es por nombre; los duplicados harían ambiguos los desplegables y las subconsultas de la semilla. (Aprobada previamente.)
- **No:** eliminar duplicados mostrando "nombre + email". Exigiría la columna `email`, que se ha descartado.
- **No:** columna `readers.email`. El laboratorio no la necesita, y quitarla evita exponer datos de contacto con la lectura pública. (Corrección posterior al plan; prevalece sobre él.)
- **Sí:** consultas relacionadas con selects embebidos de supabase-js. No añade objetos al esquema. (Aprobada previamente.)
- **No:** crear una vista. Es un objeto más y, con RLS, obliga a gestionar `security_invoker`.
- **Sí:** RLS habilitado en las tres tablas, con `SELECT` para `anon` y `authenticated` e `INSERT` solo en `reviews`. Es una defensa en profundidad si en el futuro se conceden GRANT de más. (Aprobada previamente.)
- **No:** dejar RLS deshabilitado. Los GRANT serían la única barrera, y el Security Advisor lo marca como error crítico.
- **Sí:** GRANT de `SELECT` en las tres tablas e `INSERT` en `reviews`, sin `UPDATE` ni `DELETE`. Las altas de lectores y libros se hacen solo con la semilla y el panel. (Aprobada previamente.)
- **Sí:** revocar expresamente cualquier privilegio de tabla por defecto que sobre para `anon` y `authenticated`. Es la forma de cumplir la decisión anterior si Supabase concede privilegios por defecto a las tablas nuevas. (Derivada de la decisión de GRANT.)
- **Sí:** semilla ficticia de 4 lectores, 5 libros y 5 reseñas, con FK resueltas por nombre. Da variedad sin datos reales. (Corrección posterior al plan; prevalece sobre él.)
- **Sí:** probar cada restricción inválida en una transacción independiente o tras un `SAVEPOINT`. (Corrección posterior al plan; prevalece sobre él.)
- **No:** agrupar todas las pruebas inválidas en un único `BEGIN; … ROLLBACK;`. Tras el primer error, PostgreSQL aborta la transacción y los casos siguientes no llegan a probarse.
- **No:** dar por hecho que habilitar RLS deja el Security Advisor sin avisos. Solo elimina la alerta de RLS deshabilitado; puede haber otros avisos. (Corrección posterior al plan; prevalece sobre él.)
- **Sí:** el SQL vive en las migraciones de Supabase (`list_migrations`). En el repositorio solo queda esta spec.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La política `INSERT ... WITH CHECK (true)` permite que cualquiera con la clave publicable inserte reseñas sin identificarse y con cualquier `reader_id`, es decir, haciéndose pasar por cualquier lector. También permite inserciones masivas (spam). | Riesgo aceptado de forma consciente para el laboratorio: los datos son ficticios y no hay autenticación. Los CHECK, las FK y el `UNIQUE (reader_id, book_id)` limitan el daño (máximo 20 reseñas posibles con 4 lectores y 5 libros). Restringir el `INSERT` a `authenticated` con un vínculo cuenta–lector queda para la spec de autenticación. |
| Lectura pública de todas las tablas con la clave publicable. | Aceptado: datos ficticios y sin columnas personales (sin `email`). |
| Supabase concede privilegios por defecto en `public` y `anon` termina con `UPDATE` o `DELETE`. | Revocación expresa en el paso 2 y comprobación con `has_table_privilege` en CA9. Las políticas RLS no permiten esas operaciones aunque existiera el GRANT. |
| Falta una política RLS y las consultas devuelven vacío sin error. | CA10 cuenta las políticas en `pg_policies`. CA14 comprueba los recuentos desde el rol `anon`, porque CA11 se ejecuta con un rol administrativo que no ve el efecto de RLS. |
| El Security Advisor muestra avisos aunque RLS esté habilitado. | CA13 solo exige que no aparezca la alerta de RLS deshabilitado; los demás avisos se anotan y se revisan. |
| Las pruebas inválidas dejan datos o se abortan entre sí. | Transacción independiente o `SAVEPOINT` por caso y recuento final 4/5/5 (CA12). |

## Qué no incluye esta spec

- Ningún código del frontend ni el cliente de Supabase.
- Autenticación ni vínculo entre cuenta y lector.
- `UPDATE` o `DELETE` desde la aplicación.
- La columna `readers.email`.
- Vistas, funciones o triggers.
