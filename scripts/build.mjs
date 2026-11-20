import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  legalComments: 'inline',
});
const html = await readFile('src/index.html', 'utf8');
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html.replace('<!-- GAME -->', () =>
  '<script>' + outputFiles[0].text.replace(/<\/script/gi, '<\\/script') + '</script>'));
