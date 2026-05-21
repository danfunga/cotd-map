import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const mapsDir = path.join(root, 'data', 'maps');
const files = fs.readdirSync(mapsDir)
  .filter((f) => f.endsWith('.js') && f !== 'index.js' && f !== 'display-overrides.js')
  .sort();

const out = {};

for (const file of files) {
  const mod = await import(pathToFileURL(path.join(mapsDir, file)).href);
  const map = Object.values(mod).find((v) => v && typeof v === 'object' && Array.isArray(v.entities) && v.id);
  if (!map) continue;
  const entries = {};
  for (const e of map.entities) {
    if (typeof e.display === 'string' && e.display.trim() !== '') {
      entries[e.id] = e.display;
    }
  }
  out[map.id] = entries;
}

const header = `// Editable display overrides by map id.\n// Prefer key by entity id (stable) for safe updates.\n// You can also add name-based keys if needed.\n\n`;
const body = `export const displayOverrides = ${JSON.stringify(out, null, 2)};\n`;
fs.writeFileSync(path.join(mapsDir, 'display-overrides.js'), header + body);
console.log('written content/display-overrides.js');
