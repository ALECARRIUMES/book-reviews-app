#!/usr/bin/env node
// Hook PreToolUse: Guardián de base de datos.
// Bloquea SQL destructivo enviado a mcp__supabase__execute_sql y
// mcp__supabase__apply_migration: DROP TABLE, DROP SCHEMA, TRUNCATE y
// DELETE sin WHERE. Exit 2 = bloquear (motivo por stderr), exit 0 = permitir.
// Ante cualquier entrada que no se pueda inspeccionar con seguridad, bloquea.

const BLOCK = 2;
const ALLOW = 0;

function block(reason) {
  process.stderr.write(`[guardian-bd] Operación bloqueada: ${reason}\n`);
  process.exit(BLOCK);
}

// Recorre el SQL una sola vez y devuelve dos versiones:
// - scan: sin comentarios, conservando el contenido de los literales
//   (así también se detecta SQL dinámico como EXECUTE 'DROP TABLE x').
// - structure: sin comentarios y con literales/identificadores entrecomillados
//   vaciados, para separar sentencias por ';' y buscar WHERE con fiabilidad.
// El contenido entre $$ ... $$ se conserva en ambas para que se inspeccione.
function normalize(sql) {
  let scan = "";
  let structure = "";
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? n : end;
      scan += " ";
      structure += " ";
      continue;
    }

    if (ch === "/" && next === "*") {
      // PostgreSQL admite comentarios de bloque anidados.
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      if (depth > 0) throw new Error("comentario de bloque sin cerrar");
      scan += " ";
      structure += " ";
      continue;
    }

    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2; // comilla escapada duplicada
            continue;
          }
          break;
        }
        if (ch === "'" && sql[j] === "\\") j++; // E'...\'...'
        j++;
      }
      if (j >= n) throw new Error("literal o identificador sin cerrar");
      scan += " " + sql.slice(i + 1, j) + " ";
      structure += ch === "'" ? " '' " : ' "x" ';
      i = j + 1;
      continue;
    }

    scan += ch;
    structure += ch;
    i++;
  }

  return { scan, structure };
}

const RULES = [
  { re: /\bDROP\s+TABLE\b/i, reason: "DROP TABLE no está permitido" },
  { re: /\bDROP\s+SCHEMA\b/i, reason: "DROP SCHEMA no está permitido" },
  { re: /\bTRUNCATE\b/i, reason: "TRUNCATE no está permitido" },
];

function findDeleteWithoutWhere(structure) {
  for (const statement of structure.split(";")) {
    const del = /\bDELETE\b/i.exec(statement);
    if (!del) continue;
    const rest = statement.slice(del.index + del[0].length);
    if (!/\bWHERE\b/i.test(rest)) return statement.trim();
  }
  return null;
}

function inspect(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    block("la entrada del hook no es JSON válido.");
  }

  const query = payload?.tool_input?.query;
  if (typeof query !== "string") {
    block("tool_input.query no existe o no es texto; no se puede inspeccionar.");
  }
  if (query.trim() === "") {
    block("tool_input.query está vacío; no se puede inspeccionar.");
  }

  let normalized;
  try {
    normalized = normalize(query);
  } catch (err) {
    block(`SQL no inspeccionable (${err.message}).`);
  }

  for (const { re, reason } of RULES) {
    if (re.test(normalized.scan)) block(`${reason}.`);
  }

  const offending = findDeleteWithoutWhere(normalized.structure);
  if (offending !== null) {
    block(`DELETE sin cláusula WHERE no está permitido: "${offending.replace(/\s+/g, " ").slice(0, 120)}"`);
  }

  process.exit(ALLOW);
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    inspect(input);
  } catch (err) {
    block(`error interno del guardián (${err.message}).`);
  }
});
process.stdin.on("error", (err) => {
  block(`no se pudo leer stdin (${err.message}).`);
});
