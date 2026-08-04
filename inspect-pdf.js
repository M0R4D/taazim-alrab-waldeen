// فحص سريع لملف PDF: مقاس الصفحة، الخطوط المضمّنة، والطبقات النقطية إن وُجدت.
import fs from 'node:fs';

const file = process.argv[2] || 'output/taazim-mahib-4x3.pdf';
const raw = fs.readFileSync(file).toString('latin1');
const uniq = (re) => [...new Set(raw.match(re) || [])];

const media = (raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/) || []).slice(1);
const mm = (pt) => (Number(pt) / 72) * 25.4;

console.log(`الملف: ${file}`);
if (media.length) {
  console.log(`مقاس الصفحة: ${mm(media[0]).toFixed(1)} × ${mm(media[1]).toFixed(1)} مم  (${media[0]} × ${media[1]} pt)`);
}
console.log(`خطوط مضمّنة (FontFile2): ${(raw.match(/\/FontFile2/g) || []).length}`);
console.log(`عائلات الخطوط: ${uniq(/\/BaseFont\s*\/[A-Za-z0-9+\-]+/g).map((s) => s.split('+').pop()).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);

const images = raw.match(/<<[^<>]*\/Subtype\s*\/Image[\s\S]{0,400}?>>/g) || [];
console.log(`طبقات نقطية: ${images.length}`);
for (const [i, c] of images.entries()) {
  const w = (c.match(/\/Width\s+(\d+)/) || [])[1];
  const h = (c.match(/\/Height\s+(\d+)/) || [])[1];
  const f = (c.match(/\/Filter\s*\/(\w+)/) || [])[1] || '-';
  console.log(`  ${i + 1}. ${w}×${h} px  (${f})`);
}
