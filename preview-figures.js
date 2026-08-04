// معاينة سريعة للأطياف البشرية وحدها، لضبط إحداثياتها بلا إعادة بناء البوسترات كلّها.
// الاستعمال: npm run figures
//   FIG_H=1400      تكبير الخلايا لتفحّص الأيدي عن قرب
//   FIG_KIND=awe    عزل نوع واحد (أو أكثر بفواصل) أثناء ضبطه
//   COLS=4          عدد الخلايا في الصف

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { figure, figureKinds } from './src/figures.js';
import { FIGURE_COLUMN } from './src/poster.js';
import { launchBrowser, closeBrowser } from './src/browser.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'output');

const LABELS = {
  anger: 'الغضب',
  regret: 'الندم',
  awe: 'الهيبة',
  stand: 'النصرة',
  hush: 'اللسان',
  kin: 'الأبناء',
};

const only = (process.env.FIG_KIND || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const kinds = only.length ? figureKinds.filter((k) => only.includes(k)) : figureKinds;
if (!kinds.length) throw new Error(`FIG_KIND غير معروف. المتاح: ${figureKinds.join(', ')}`);

// النِّسَب هي نِسَب عمود الطيف الفعلية في التخطيط، حتى تكون المعاينة صادقة
const CELLS = kinds.flatMap((kind) => [
  { kind, ...FIGURE_COLUMN.landscape, label: `${LABELS[kind]} — أفقي` },
  { kind, ...FIGURE_COLUMN.portrait, label: `${LABELS[kind]} — رأسي` },
]);

const COLORS = { fill: '#05070f', rim: '#e8bd66', spark: '#e8903f' };
const H = Number(process.env.FIG_H || 640); // FIG_H=1400 لتفحّص اليدين عن قرب
const COLS = Number(process.env.COLS || Math.min(CELLS.length, 6));
const GAP = 28;
const PAD = 24;
const CELL_W = Math.round(H * FIGURE_COLUMN.landscape.aspect); // أوسع عمود، فتتساوى الأعمدة

const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#101a2e;padding:${PAD}px;font-family:'Dubai','Segoe UI',sans-serif}
  .grid{display:grid;grid-template-columns:repeat(${COLS}, ${CELL_W}px);gap:${GAP}px;justify-content:start}
  .cell{display:flex;flex-direction:column;align-items:center;gap:10px}
  .frame{border:1px dashed rgba(232,189,102,0.4)}
  .frame svg{width:100%;height:100%;display:block}
  .cap{color:#c3cde3;font-size:15px}
</style></head><body><div class="grid">
${CELLS.map(
  (c) =>
    `<div class="cell">
       <div class="frame" style="height:${H}px;width:${Math.round(H * c.aspect)}px">${figure(c.kind, { ...COLORS, aspect: c.aspect })}</div>
       <div class="cap">${c.label}</div>
     </div>`,
).join('\n')}
</div></body></html>`;

const browser = await launchBrowser();
try {
  fs.mkdirSync(path.join(OUT, '_render'), { recursive: true });
  const file = path.join(OUT, '_render', 'figures.html');
  fs.writeFileSync(file, html, 'utf8');

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
  await page.goto(`file://${file.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  // المقاس يُقاس من الصفحة نفسها لا يُحسب: كروميوم يُخرج صورةً فارغة إن جاوز إطار العرض المحتوى
  const box = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  await page.setViewport({ width: box[0], height: box[1], deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(OUT, '_figures.png'), type: 'png', captureBeyondViewport: false });
  await page.close();
  console.log(`معاينة ${CELLS.length} خليّة: ${path.join(OUT, '_figures.png')}`);
} finally {
  await closeBrowser(browser);
}
process.exit(0);
