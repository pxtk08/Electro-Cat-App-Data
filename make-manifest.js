// make-manifest.js — quét thư mục data/ trong repo, tính sha256, sinh manifest.json
// Cách dùng: đặt file này vào thư mục gốc repo (cạnh thư mục data/), mở terminal ở đó rồi chạy:  node make-manifest.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
// Lấy đúng chữ HOA/thường của tên thư mục thật (Windows không phân biệt hoa/thường nhưng GitHub thì có)
const want = process.argv[2] || 'data';
const real = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).find((n) => n.toLowerCase() === want.toLowerCase()) : null;
const DIR = path.join(ROOT, real || want);
const OK = /\.zip$/i;

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

if (!fs.existsSync(DIR)) { console.error('Không thấy thư mục: ' + DIR); process.exit(1); }

const files = walk(DIR).filter((f) => OK.test(f)).sort().map((f) => {
  const buf = fs.readFileSync(f);
  if (buf.length > 95 * 1024 * 1024) console.warn('! File gần/quá 100MB (GitHub từ chối): ' + path.basename(f));
  return {
    path: path.relative(ROOT, f).split(path.sep).join('/'),
    size: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex')
  };
});

fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify({ version: new Date().toISOString(), files }, null, 2));
console.log('Đã ghi manifest.json với ' + files.length + ' file.');
