/* Gabungkan aplikasi menjadi satu file HTML yang bisa dibuka offline / dikirim lewat email.
 *   node tools/build.js                  → dist/toolkit-tangki.html
 *   node tools/build.js --fragment <out> → versi tanpa <html>/<head>/<body> (untuk host yang membungkus sendiri)
 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => `<style>\n${fs.readFileSync(path.join(root, f), 'utf8')}</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => `<script>\n${fs.readFileSync(path.join(root, f), 'utf8')}</script>`);
const i = process.argv.indexOf('--fragment');
if (i > 0) {
  const frag = html
    .replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
    .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
  fs.writeFileSync(process.argv[i + 1], frag);
  console.log('fragment →', process.argv[i + 1]);
} else {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'toolkit-tangki.html'), html);
  console.log('dist/toolkit-tangki.html', (html.length / 1024).toFixed(0) + ' KB');
}
