#!/usr/bin/env node
// Hook UserPromptSubmit: Bitácora de prompts.
// Añade cada prompt del usuario, con fecha y hora de recepción, al final de
// bitacora-ia.md en la raíz del repositorio. Nunca escribe en stdout (con
// exit 0 se inyectaría como contexto) y nunca devuelve 2 (bloquearía el
// prompt). Ante un error lo informa por stderr, sin el contenido del prompt,
// y sale con 1, que no bloquea.

import { appendFileSync, closeSync, openSync, writeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OK = 0;
const NON_BLOCKING_ERROR = 1;

// El proyecto se deduce de la ubicación del script (.claude/hooks/).
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const logPath = resolve(projectDir, "bitacora-ia.md");

const HEADER = "# Bitácora de IA\n\nRegistro automático de los prompts enviados a Claude Code (hook UserPromptSubmit).\n";

function fail(reason) {
  process.stderr.write(`[bitacora-prompts] No se registró el prompt: ${reason}\n`);
  process.exit(NON_BLOCKING_ERROR);
}

// Fecha y hora local con su desfase UTC, p. ej. 2026-10-17 18:05:09 (UTC-06:00).
function timestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ` +
    `(UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)})`
  );
}

// Bloque de código cuya valla es más larga que cualquier racha de comillas
// invertidas del prompt: el contenido se conserva literal, sin que Markdown lo
// interprete ni lo pueda cerrar antes de tiempo.
function fenced(text) {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  const body = text.endsWith("\n") ? text : `${text}\n`;
  return `${fence}text\n${body}${fence}\n`;
}

function record(raw, receivedAt) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    fail("la entrada del hook no es JSON válido.");
  }

  const prompt = payload?.prompt;
  if (typeof prompt !== "string") fail("el campo prompt no existe o no es texto.");

  const entry = `\n---\n\n## ${timestamp(receivedAt)}\n\n${fenced(prompt)}`;

  try {
    // Crea el archivo con su encabezado solo si aún no existe ('wx' falla si
    // existe), y después siempre añade al final ('a'): nunca se sobrescribe.
    try {
      const fd = openSync(logPath, "wx");
      try {
        writeSync(fd, HEADER, null, "utf8");
      } finally {
        closeSync(fd);
      }
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    appendFileSync(logPath, entry, { encoding: "utf8", flag: "a" });
  } catch (err) {
    fail(`error al escribir en ${logPath} (${err.code ?? "error desconocido"}).`);
  }

  process.exit(OK);
}

const receivedAt = new Date();
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    record(input, receivedAt);
  } catch (err) {
    fail(`error interno del hook (${err.name}).`);
  }
});
process.stdin.on("error", (err) => {
  fail(`no se pudo leer stdin (${err.code ?? err.name}).`);
});
