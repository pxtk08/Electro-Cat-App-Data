// make-manifest.js — quét thư mục data/ trong repo, tính sha256, sinh manifest.json
// Cách dùng: đặt file này vào thư mục gốc repo (cạnh thư mục data/), mở terminal ở đó rồi chạy:  node make-manifest.js
// Mỗi file có ngày "updated" riêng: file không đổi giữ ngày cũ, file mới/đổi hash nhận ngày hôm nay.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
// Lấy đúng chữ HOA/thường của tên thư mục thật (Windows không phân biệt hoa/thường nhưng GitHub thì có)
const want = process.argv[2] || 'data';
const real = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).find((n) => n.toLowerCase() === want.toLowerCase()) : null;
const DIR = path.join(ROOT, real || want);
const OK = /\.zip$/i;
const OUT = path.join(ROOT, 'manifest.json');

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

if (!fs.existsSync(DIR)) { console.error('Không thấy thư mục: ' + DIR); process.exit(1); }

// Đọc manifest cũ để biết file nào đã có / đổi, và giữ ngày của file không đổi
let old = null;
try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
const oldMap = new Map(((old && old.files) || []).map((f) => [f.path, f]));
const now = new Date().toISOString();

const files = walk(DIR).filter((f) => OK.test(f)).sort().map((f) => {
  const buf = fs.readFileSync(f);
  if (buf.length > 95 * 1024 * 1024) console.warn('! File gần/quá 100MB (GitHub từ chối): ' + path.basename(f));
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const prev = oldMap.get(rel);
  const changed = !prev || prev.sha256 !== sha256;
  if (!prev) console.log('+ mới:  ' + rel);
  else if (changed) console.log('~ đổi:  ' + rel);
  return {
    path: rel,
    size: buf.length,
    sha256,
    updated: changed ? now : (prev.updated || (old && old.version) || now)
  };
});

const fileSet = new Set(files.map((f) => f.path));
for (const p of oldMap.keys()) if (!fileSet.has(p)) console.log('- xoá:  ' + p);

if (old && JSON.stringify(old.files) === JSON.stringify(files)) {
  console.log('Không có thay đổi, giữ nguyên manifest.json (' + files.length + ' file).');
} else {
  fs.writeFileSync(OUT, JSON.stringify({ version: now, files }, null, 2));
  console.log('Đã ghi manifest.json với ' + files.length + ' file.');
}
