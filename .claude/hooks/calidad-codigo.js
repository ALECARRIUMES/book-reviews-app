#!/usr/bin/env node
// Hook PostToolUse: Calidad de código.
// Tras cada Edit/Write sobre un archivo .js o .jsx ejecuta el oxlint instalado
// en el proyecto sobre ese archivo. Exit 2 = errores de lint o linter no
// ejecutable (diagnóstico por stderr, que Claude recibe); exit 0 = sin errores
// o archivo que no es JavaScript/JSX.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPORT = 2;
const OK = 0;
const LINT_TIMEOUT_MS = 25_000;

// El proyecto se deduce de la ubicación del script (.claude/hooks/), sin
// depender de variables de entorno ni del directorio actual.
const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const oxlintBin = resolve(projectDir, "node_modules", "oxlint", "bin", "oxlint");
const oxlintConfig = resolve(projectDir, ".oxlintrc.json");

function report(message) {
  process.stderr.write(`[calidad-codigo] ${message}\n`);
  process.exit(REPORT);
}

function lint(filePath) {
  if (!existsSync(oxlintBin)) {
    report(`no se pudo ejecutar oxlint: no existe ${oxlintBin}. Ejecuta npm install. El archivo NO ha sido validado.`);
  }

  // Sin shell y con argumentos en array: la ruta del archivo nunca se interpreta.
  // Es absoluta, así que tampoco puede confundirse con una opción.
  const result = spawnSync(process.execPath, [oxlintBin, "-c", oxlintConfig, filePath], {
    cwd: projectDir,
    encoding: "utf8",
    shell: false,
    timeout: LINT_TIMEOUT_MS,
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();

  if (result.error) {
    report(`no se pudo ejecutar oxlint (${result.error.message}). El archivo NO ha sido validado.`);
  }
  // oxlint sale con 1 sin analizar nada si no reconoce la extensión (p. ej.
  // .JSX) o la ruta está ignorada: no es un error de lint ni una validación.
  if (/No files found to lint/i.test(output)) {
    report(
      `oxlint no analizó ${filePath} (extensión no reconocida o ruta ignorada). ` +
        `El archivo NO ha sido validado.\n${output}`,
    );
  }
  if (result.status === 0) {
    if (output) process.stdout.write(`${output}\n`); // avisos: no bloquean
    process.exit(OK);
  }
  if (result.status === 1) {
    report(`oxlint encontró errores en ${filePath}. Corrígelos:\n${output}`);
  }
  report(
    `oxlint terminó de forma inesperada (código ${result.status}, señal ${result.signal}). ` +
      `El archivo NO ha sido validado.${output ? `\n${output}` : ""}`,
  );
}

function inspect(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    report("la entrada del hook no es JSON válido; no se pudo revisar el archivo.");
  }

  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath !== "string" || filePath.trim() === "") {
    report("tool_input.file_path no existe o no es texto; no se pudo revisar el archivo.");
  }

  const ext = extname(filePath).toLowerCase();
  if (ext !== ".js" && ext !== ".jsx") process.exit(OK);

  const absolute = isAbsolute(filePath) ? filePath : resolve(projectDir, filePath);
  if (!existsSync(absolute)) {
    report(`el archivo ${absolute} no existe; no se pudo revisar.`);
  }

  lint(absolute);
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
    report(`error interno del hook (${err.message}). El archivo NO ha sido validado.`);
  }
});
process.stdin.on("error", (err) => {
  report(`no se pudo leer stdin (${err.message}).`);
});
