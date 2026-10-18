---
name: nuevo-spec
description: Diseña y redacta una spec siguiendo Spec-Driven Development. Reconoce primero las decisiones ya aprobadas, pregunta solo lo que siga ambiguo y guarda la spec en specs/ en estado Borrador. Úsalo antes de implementar cualquier funcionalidad.
disable-model-invocation: true
argument-hint: 'NN-slug (p. ej. 01-modelo-datos, 02-frontend) o descripción breve de la funcionalidad'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

<!--
Adaptación académica de la skill `spec` de Fernando Herrera
(https://github.com/Klerith/fernando-skills), licencia MIT.
Copyright (c) 2026 Fernando Herrera. Ver LICENSE en esta carpeta.
-->

# /nuevo-spec — Diseñador guiado de specs

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec; nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ todavía no existe"`

---

Esta skill ayuda a producir una spec útil siguiendo Spec-Driven Development. **Aquí no se escribe código.** Tu trabajo es aclarar qué se quiere construir, preguntar solo lo que no esté bien definido y redactar la spec hasta que esté lista para guardarse en `specs/`.

## Filosofía

Una spec no es documentación decorativa. Es el contrato que guía la implementación posterior. Si la spec es vaga, el código improvisa. Por eso la definición es **deliberadamente cuidadosa** y la redacción es **rápida** cuando la información ya está completa.

Principio del proyecto: **una spec aprobada antes de cualquier implementación.**

Lee `template.md` (en la misma carpeta que esta skill) para ver la estructura completa. Apóyate en ella en cada paso.

## Responsabilidad y límites

Tu responsabilidad termina al guardar la spec para revisión. Durante esta skill:

- No implementes funcionalidades ni escribas código de la aplicación.
- No ejecutes SQL ni migraciones, ni invoques subagentes o herramientas de Supabase.
- No crees ramas, no hagas commits ni push.
- No marques ninguna spec como `Aprobada`.
- El único archivo que escribes es `specs/NN-slug.md`.

## Flujo del comando

Sigue las cuatro fases en orden. Responde en el idioma del prompt inicial (en este proyecto, español).

### Fase 1 — Entender el contexto y las decisiones ya tomadas

1. Lee la memoria del proyecto si existe. Prueba en orden y para en la primera: `CLAUDE.md`, `AGENTS.md`, `README.md`.
2. Revisa el listado de `specs/` del contexto de sesión para ver qué specs existen y cómo están numeradas.
3. Si hay specs previas, lee al menos las dos más recientes para respetar sus convenciones de idioma, estados y títulos.
4. **Reconoce las decisiones ya documentadas y aprobadas.** Búscalas en:
   - la conversación actual (decisiones que el usuario declare aprobadas, planes aprobados, correcciones explícitas);
   - specs en estado `Aprobada` o `Implementada` de las que dependa esta;
   - `CLAUDE.md`.
5. Resume esas decisiones al usuario en una lista breve titulada **"Decisiones cerradas que voy a respetar"**. No las reabras ni las vuelvas a preguntar. Si dos fuentes se contradicen, señala la contradicción concreta y pregunta solo por ella.
6. Resuelve el argumento según la sección **Argumentos**. Si `$ARGUMENTS` viene vacío, pide una descripción de **una sola frase**. Si la descripción no cabe en una frase, la funcionalidad es demasiado grande: propón dividirla.

### Fase 2 — Aclarar mediante preguntas (solo lo pendiente)

Esta fase siempre se evalúa, pero **solo genera preguntas cuando hay ambigüedad real**. Antes de preguntar, descarta todo lo que ya cubren las decisiones cerradas de la Fase 1.

- Si las decisiones cerradas permiten responder las tres preguntas de cierre (ver abajo) sin suponer nada, **no preguntes**: dilo en una línea y pasa a la Fase 3.
- No generes rondas artificiales ni preguntes para confirmar lo ya aprobado.

Cuando sí haya huecos, pregunta en bloques de 3 a 5 preguntas y espera respuesta antes de continuar.

**Categorías a considerar (solo las que sigan abiertas):**

- **Alcance:** qué entra y qué NO; qué se deja para otra spec.
- **Datos:** tablas, columnas, tipos, relaciones, restricciones; o estructuras de datos que consume el frontend.
- **Integración:** de qué specs depende; si modifica algo existente o solo añade.
- **Permisos y seguridad:** GRANT, RLS y políticas para `anon` y `authenticated`.
- **UX y estados:** cómo se ve cuando funciona, cuando falla y en estados intermedios (carga, vacío, error).
- **Riesgos:** qué puede romperse y qué pasa en el caso degradado.
- **Verificación:** cómo se comprobará cada criterio (SQL, navegador, panel de Supabase, lint/build).

**Cómo formular las preguntas:**

- Concretas, no abiertas. ❌ "¿Cómo imaginas los permisos?" → ✅ "¿`anon` puede insertar en `reviews` o solo leer?"
- Ofrece de 2 a 4 opciones, marca tu recomendación y explica por qué.
- En Claude Code usa `AskUserQuestion` para estos bloques, con la recomendación primero. Si no está disponible, usa una lista numerada.
- Si una respuesta abre otra gran funcionalidad (p. ej. "y también autenticación con perfiles"), indica que merece su propia spec y pregunta si queda fuera del alcance.

**Preguntas de cierre.** Deja de preguntar cuando puedas responder sin suponer:

1. ¿Qué archivos, tablas u objetos aparecerán o cambiarán?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que la funcionalidad está terminada?

### Fase 3 — Redactar la spec

Si tienes toda la información (las tres preguntas de cierre tienen respuesta sin suponer nada), **redacta la spec completa** y pasa a la Fase 4. No pidas confirmación sección por sección ni muestres un borrador previo: el usuario revisa el archivo guardado.

Solo si falta información, desarrolla las secciones **una a una**, mostrando cada una y esperando confirmación antes de la siguiente.

**Cabecera y secciones obligatorias, en este orden exacto:**

0. **Cabecera** (título, estado, dependencias, fecha).
1. **Objetivo** — una sola frase. Si no cabe en una, vuelve a la Fase 2.
2. **Alcance** — con los bloques **Incluye** y **No incluye**. El "No incluye" es obligatorio.
3. **Modelo de datos** — siempre obligatoria, también en specs de frontend:
   - **Base de datos (Supabase):** tablas, columnas, tipos, PK, FK (con su acción `ON DELETE`), CHECK, UNIQUE, GRANT, RLS, políticas y datos de ejemplo.
   - **Frontend:** estructuras y relaciones de datos que se consumen (tablas y columnas leídas, forma de los objetos, consultas de supabase-js).
   - **Si no cambia el esquema:** dilo expresamente y enumera qué tablas y estructuras reutiliza y de qué spec proceden.
4. **Plan de implementación** — pasos numerados; cada uno deja el sistema funcional y verificable.
5. **Criterios de aceptación** — checklist booleana; cada criterio indica cómo se verifica (prueba técnica, consulta SQL, navegador o panel de Supabase).
6. **Decisiones tomadas y descartadas** — cada una con su motivo. Incluye las decisiones cerradas de la Fase 1, indicando que ya estaban aprobadas.

Secciones opcionales, después de las seis obligatorias: **Riesgos identificados** y **Qué no incluye esta spec** (refuerzo final).

**Errores comunes a evitar:**

- Criterios no verificables ("que funcione bien").
- Pasos del plan que no están en el alcance.
- Nombres de archivos, tablas o columnas que el usuario no confirmó.
- Omitir la sección de decisiones o la de modelo de datos.
- Escribir scripts completos de migración: la spec describe; el SQL definitivo se escribe al implementar.

### Fase 4 — Guardar la spec

1. Determina la ruta según la sección **Argumentos**.
2. Usa la fecha del contexto de sesión para el campo `**Fecha:**`. **Nunca escribas una fecha que no hayas leído de ahí.**
3. Escribe el archivo directamente en `specs/NN-slug.md`. No pidas permiso para escribirlo ni para el nombre; anuncia la ruta al confirmar. Si el archivo ya existe, **detente y pregunta**: nunca lo sobrescribas.
4. El estado es siempre `Borrador`. **Nunca lo marques como `Aprobada`**; eso lo hace el estudiante tras releerla.
5. Si la cabecera declara dependencias (`**Depende de:** SPEC 01`), comprueba que cada spec referenciada existe en `specs/`. Si no existe, dilo en vez de dejar una referencia colgante.
6. Confirma al usuario:
   - La ruta del archivo creado.
   - Que está en `Borrador` y debe revisarse y cambiarse a `Aprobada` manualmente antes de implementar.
   - **Detente aquí.** No propongas implementar la spec ni realices ninguna otra acción.

## Argumentos

`$ARGUMENTS` puede ser un identificador de archivo o una descripción.

1. **`NN-slug` (dos dígitos, guion y slug en kebab-case, sin espacios).** Ejemplos soportados: `01-modelo-datos` → `specs/01-modelo-datos.md`; `02-frontend` → `specs/02-frontend.md`. Usa ese nombre **exactamente**, sin renumerar ni cambiar el slug. Antes de escribir:
   - Si `specs/NN-slug.md` ya existe, detente y pregunta.
   - Si existe otra spec con el mismo número `NN-` y distinto slug, detente y avisa: no dupliques la numeración.
   - El slug también sirve como semilla de la descripción; no pidas confirmación del nombre.
2. **Slug sin número (un solo token kebab-case, p. ej. `listado-resenas`).** Asigna el siguiente número: el mayor existente más uno, con dos dígitos (`01-` si `specs/` está vacía o no existe).
3. **Descripción con espacios.** Úsala como punto de partida de la Fase 1, asigna el siguiente número y genera un slug corto en kebab-case a partir del objetivo.

Si se invoca `/nuevo-spec` sin argumentos, empieza pidiendo la descripción de una frase.

## Reglas estrictas

- **Nunca escribas código durante este comando.** Solo el `.md` de la spec al final.
- **Nunca apruebes una spec.** Toda spec nueva se guarda en `Borrador`.
- **Nunca reabras decisiones ya aprobadas** ni las preguntes de nuevo.
- **Nunca supongas decisiones que el usuario no confirmó.** Si falta información, pregunta en la Fase 2.
- **No repitas en la Fase 3 lo que ya se respondió.**
- **Si el usuario quiere saltarse las preguntas pendientes**, recuérdale: "Las preguntas ahora ahorran horas después. ¿Seguro que quieres saltarlas?". Si insiste, respétalo y regístralo en las decisiones ("Definición rápida sin aclaración detallada").
- **Si la funcionalidad es demasiado grande** (no cabe en una frase, toca más de tres áreas o exige decisiones en cuatro dominios o más), propone dividirla en varias specs.

## Tono al preguntar

Directo y específico. No te disculpes por preguntar. Numera las preguntas para que sean fáciles de responder.

Ejemplo de bloque bien formado:

> Antes de redactar el modelo de datos necesito aclarar dos cosas:
>
> 1. **Borrado.** ¿Las FK de `reviews` usan `ON DELETE RESTRICT` o `CASCADE`? Recomendación: `RESTRICT`, para no perder reseñas en silencio.
> 2. **Datos de ejemplo.** ¿Cuántos registros ficticios por tabla? Opciones: (a) 3, (b) 5. Recomendación: (b), para que las consultas muestren variedad.
