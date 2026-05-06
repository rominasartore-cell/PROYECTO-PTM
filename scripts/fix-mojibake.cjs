const fs = require("fs");
const path = require("path");

const root = process.cwd();

const allowedExt = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".css",
  ".html"
]);

const skipDirs = new Set([
  "node_modules",
  ".next",
  ".git",
  "storage",
  "emails_outbox",
  "BACKUPS_PTM"
]);

const cp1252Map = new Map([
  ["€", 0x80], ["‚", 0x82], ["ƒ", 0x83], ["„", 0x84], ["…", 0x85],
  ["†", 0x86], ["‡", 0x87], ["ˆ", 0x88], ["‰", 0x89], ["Š", 0x8A],
  ["‹", 0x8B], ["Œ", 0x8C], ["Ž", 0x8E], ["‘", 0x91], ["’", 0x92],
  ["“", 0x93], ["”", 0x94], ["•", 0x95], ["–", 0x96], ["—", 0x97],
  ["˜", 0x98], ["™", 0x99], ["š", 0x9A], ["›", 0x9B], ["œ", 0x9C],
  ["ž", 0x9E], ["Ÿ", 0x9F]
]);

function encodeCp1252(str) {
  const bytes = [];

  for (const ch of str) {
    const code = ch.codePointAt(0);

    if (code <= 0xff) {
      bytes.push(code);
    } else if (cp1252Map.has(ch)) {
      bytes.push(cp1252Map.get(ch));
    } else {
      return null;
    }
  }

  return Buffer.from(bytes);
}

function fixChunk(chunk) {
  const bytes = encodeCp1252(chunk);
  if (!bytes) return chunk;

  const decoded = bytes.toString("utf8");

  if (!decoded || decoded.includes("�")) return chunk;
  if (decoded === chunk) return chunk;

  return decoded;
}

function fixContent(content) {
  let result = content;

  // Repetir por si hay doble mojibake.
  for (let i = 0; i < 3; i++) {
    const before = result;

    result = result.replace(
      /[\u00C2\u00C3\u00E2\u00F0\u00EF][^\s<>"'`()\[\]{};,]*/gu,
      (match) => fixChunk(match)
    );

    if (result === before) break;
  }

  // Reemplazos finales seguros.
  result = result
    .replace(/Â¿/g, "¿")
    .replace(/Â¡/g, "¡")
    .replace(/Â©/g, "©")
    .replace(/Â°/g, "°")
    .replace(/Âº/g, "º")
    .replace(/Â/g, "");

  return result;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, files);
    } else if (allowedExt.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

const files = walk(path.join(root, "src"));
const changed = [];

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const fixed = fixContent(original);

  if (fixed !== original) {
    fs.writeFileSync(file, fixed, "utf8");
    changed.push(path.relative(root, file));
  }
}

console.log("Archivos modificados:");
for (const file of changed) {
  console.log(" - " + file);
}

if (changed.length === 0) {
  console.log("No se encontraron cambios.");
}
