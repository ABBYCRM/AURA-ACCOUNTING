// Copy schema.sql from src to dist after TypeScript build.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'backend', 'src', 'db', 'schema.sql');
const dest = path.join(root, 'backend', 'dist', 'db', 'schema.sql');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[copy-schema] ${src} -> ${dest}`);
