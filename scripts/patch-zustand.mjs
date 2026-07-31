/**
 * Postinstall: parchea zustand para que no resuelva a ESM (.mjs) en web.
 *
 * Zustand v5 tiene un exports map con condición "import" → esm/*.mjs.
 * Esos archivos usan `import.meta.env` que Metro + Hermes engine no manejan en web.
 *
 * Este script elimina la condición "import" del exports map, forzando
 * que Metro use la condición "default" que apunta a los archivos CJS (.js).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const zustandPkgPath = join(
  __dirname,
  '..',
  'node_modules',
  'zustand',
  'package.json',
);

try {
  const pkg = JSON.parse(readFileSync(zustandPkgPath, 'utf-8'));

  if (!pkg.exports) {
    console.log('[patch-zustand] No exports field found, skipping.');
    process.exit(0);
  }

  let modified = false;

  for (const [key, value] of Object.entries(pkg.exports)) {
    if (typeof value === 'object' && value !== null && 'import' in value) {
      // eslint-disable-next-line no-console
      console.log(`[patch-zustand] Removing "import" condition from exports["${key}"]`);
      const { import: _import, ...rest } = value;
      pkg.exports[key] = rest;
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(zustandPkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log('[patch-zustand] ✅ Patched zustand package.json');
  } else {
    console.log('[patch-zustand] No "import" conditions found, nothing to patch.');
  }
} catch (err) {
  console.error('[patch-zustand] Failed:', err);
  process.exit(1);
}
