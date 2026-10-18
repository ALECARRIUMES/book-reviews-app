# Plantilla de una spec útil

<!--
Adaptación académica de la plantilla de la skill `spec` de Fernando Herrera
(https://github.com/Klerith/fernando-skills), licencia MIT.
Copyright (c) 2026 Fernando Herrera. Ver LICENSE en esta carpeta.
-->

Este archivo es la referencia que consulta la skill `/nuevo-spec` al generar specs. Cada sección incluye su propósito y un ejemplo mínimo. **No es texto para copiar literalmente**: es la forma que la spec debe respetar.

Las seis secciones obligatorias, en este orden exacto, son: **Objetivo**, **Alcance**, **Modelo de datos**, **Plan de implementación**, **Criterios de aceptación** y **Decisiones tomadas y descartadas**.

---

## Cabecera

Toda spec empieza con un título y metadatos en un blockquote simple (sin tablas):

```markdown
# SPEC NN — Título breve y descriptivo

> **Estado:** Borrador
> **Depende de:** Ninguna
> **Fecha:** AAAA-MM-DD
```

**Estados válidos:** `Borrador`, `En revisión`, `Aprobada`, `Implementada`, `Obsoleta`.

Toda spec nueva se crea en `Borrador`. Solo el estudiante la cambia a `Aprobada` tras revisarla. Si hay dependencias, se escriben como `SPEC 01, SPEC 02`.

---

## Objetivo

Una sola frase que se entienda en 5 segundos. Si necesita dos frases, la funcionalidad es demasiado grande y hay que dividirla.

```markdown
## Objetivo

Crear en Supabase las tablas de lectores, libros y reseñas con integridad referencial y datos de ejemplo.
```

---

## Alcance

Dos bloques explícitos. **Ambos son obligatorios.**

```markdown
## Alcance

**Incluye:**

- Cosa concreta uno.
- Cosa concreta dos.

**No incluye (para futuras specs):**

- Algo que podría hacerse, pero no ahora.
- Algo que surgió en la conversación y se dejó fuera.
```

**Por qué importa el "No incluye":** registra lo que se mencionó y se decidió aplazar. Sin ese registro, durante la implementación aparece la tentación de añadirlo "ya que estamos".

---

## Modelo de datos

**Siempre obligatoria.** Describe las estructuras concretas que aparecen, cambian o se consumen, con nombres reales.

**Spec de base de datos (Supabase).** Una tabla de columnas por cada tabla, más las restricciones, permisos y datos de ejemplo:

```markdown
## Modelo de datos

### Tabla `authors`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| id | bigint generated always as identity | PK |
| name | text | NOT NULL, UNIQUE |

### Tabla `articles`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| id | bigint generated always as identity | PK |
| author_id | bigint | NOT NULL, FK → authors(id) ON DELETE RESTRICT |
| title | text | NOT NULL, CHECK (length(trim(title)) > 0) |

### Permisos y RLS

- GRANT: `SELECT` en `authors` y `articles` para `anon` y `authenticated`.
- RLS habilitado en ambas tablas.
- Política `SELECT ... TO anon, authenticated USING (true)` en cada tabla.

### Datos de ejemplo

- `authors`: 3 registros ficticios.
- `articles`: 3 registros ficticios; las FK se resuelven por nombre, no con IDs fijos.
```

**Spec de frontend.** Estructuras y relaciones de datos que se consumen:

```markdown
## Modelo de datos

Esta spec no modifica el esquema. Reutiliza las tablas `authors` y `articles` de SPEC 01.

Datos consumidos:

- Listado: `articles` con `id, title` y el autor embebido `authors(name)`.
- Formulario: `authors(id, name)` para el selector; se envía `author_id`, nunca escrito a mano.

Forma de cada elemento del listado:

\`\`\`js
{ id: 1, title: "…", authors: { name: "…" } }
\`\`\`
```

Si la funcionalidad no cambia el esquema, dilo expresamente y enumera qué tablas y estructuras reutiliza y de qué spec proceden.

---

## Plan de implementación

Pasos numerados. Cada paso deja el sistema en un estado **funcional y verificable**.

```markdown
## Plan de implementación

1. Crear las tablas con sus PK, FK y restricciones.
2. Conceder los GRANT y habilitar RLS con sus políticas.
3. Insertar los datos de ejemplo.
4. ...
```

**Reglas:**

- Cada paso debe poder revisarse por separado.
- Si un paso es demasiado grande, divídelo.
- El último paso **no** es "probarlo todo": eso son los criterios de aceptación.
- El plan describe qué se hará; la skill no lo ejecuta.

---

## Criterios de aceptación

Checklist booleana. Cada criterio se responde con sí o no e indica cómo se verifica: prueba técnica, consulta SQL, navegador o panel de Supabase.

```markdown
## Criterios de aceptación

- [ ] CA1 — Existen las tablas `authors` y `articles` en `public`. Verificación: SQL sobre `information_schema.tables`.
- [ ] CA2 — `articles.author_id` es FK con `ON DELETE RESTRICT`. Verificación: SQL sobre `pg_constraint`.
- [ ] CA3 — Un título vacío se rechaza. Verificación: SQL con `INSERT` dentro de una transacción o `SAVEPOINT` revertido.
- [ ] CA4 — El listado muestra el nombre del autor. Verificación: navegador.
- [ ] CA5 — `npm run lint` y `npm run build` terminan sin errores. Verificación: prueba técnica.
```

**Antipatrones a evitar:**

- ❌ "Que funcione bien." → no verificable.
- ❌ "Buena UX." → subjetivo.
- ✅ "Al enviar el formulario sin elegir autor, se muestra un mensaje de error y no se inserta nada." → verificable y booleano.

Para probar restricciones con datos inválidos, cada caso va en su propia transacción o tras un `SAVEPOINT`. Así un error no anula las pruebas siguientes, y no queda ningún dato.

---

## Decisiones tomadas y descartadas

La sección con más valor a largo plazo. Registra **lo que se consideró**, no solo lo que se eligió, siempre con un motivo.

```markdown
## Decisiones tomadas y descartadas

- **Sí:** `ON DELETE RESTRICT` en las FK. Evita perder registros dependientes en silencio. (Aprobada previamente.)
- **No:** `ON DELETE CASCADE`. Borraría datos sin aviso.
- **Sí:** consultas con relaciones embebidas de supabase-js. No requiere vistas adicionales.
- **No:** crear una vista. Añade un objeto más sin necesidad en el laboratorio.
```

Marca las decisiones que ya estaban aprobadas antes de redactar la spec. Las decisiones sin motivo son las primeras que se cuestionan después.

---

## Riesgos identificados (opcional)

Solo cuando haya riesgos no evidentes. Tabla simple:

```markdown
## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Falta una política RLS y la consulta devuelve vacío sin error | Criterio de aceptación que cuenta las políticas en `pg_policies`. |
```

---

## Qué no incluye esta spec (opcional, refuerzo)

Repite al final lo que **no** se hará. La repetición es deliberada: sirve de recordatorio a quien lea solo las últimas líneas.

```markdown
## Qué no incluye esta spec

- Autenticación de usuarios.
- Edición o borrado de registros desde la aplicación.
```

---

## Reglas globales del documento

- **Una idea por frase.**
- **Nombres concretos.** En vez de "la tabla de reseñas", escribe `reviews`; en vez de "el componente", `src/components/ReviewForm.jsx`.
- **Sin TODO.** Un TODO significa que la decisión no se tomó. Tómala o regístrala como decisión pendiente con su motivo.
- **Sin código ejecutable largo.** La spec describe y el código se escribe después. Fragmentos breves de estructuras de datos, restricciones o políticas sí; scripts completos de migración o funciones enteras, no.
- **Markdown estándar** que se vea bien en GitHub.
