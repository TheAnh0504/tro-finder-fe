import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const target = path.join(root, 'public/pdf.worker.js');

if (!fs.existsSync(source)) {
  console.warn('[sync-pdf-worker] pdfjs-dist worker not found, skipping');
  process.exit(0);
}

fs.copyFileSync(source, target);
console.log('[sync-pdf-worker] copied pdf.worker.min.mjs -> public/pdf.worker.js');
