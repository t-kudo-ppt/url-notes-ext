import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('public/manifest.json', 'dist/manifest.json');
await cp('public/sidepanel.html', 'dist/sidepanel.html');
console.warn('[copy-static] public -> dist 完了');
