// لقطة واحدة تجمع كل البوسترات المولّدة، لمراجعتها بنظرة واحدة.
// الاستعمال: npm run sheet

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, closeBrowser } from './src/browser.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'output');
const COLS = Number(process.env.COLS || 6);

const files = fs
  .readdirSync(OUT)
  .filter((f) => f.endsWith('-preview.png'))
  .sort();

const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
  body{margin:0;padding:14px;background:#0e1016;font-family:'Segoe UI',sans-serif}
  .g{display:grid;grid-template-columns:repeat(${COLS},1fr);gap:12px}
  figure{margin:0}
  img{width:100%;display:block;background:#000}
  figcaption{color:#9aa5bb;font-size:11px;padding-top:4px;text-align:center;direction:ltr}
</style></head><body><div class="g">
${files.map((f) => `<figure><img src="../${f}"><figcaption>${f.replace('taazim-', '').replace('-preview.png', '')}</figcaption></figure>`).join('')}
</div></body></html>`;

const file = path.join(OUT, '_render', 'sheet.html');
fs.writeFileSync(file, html, 'utf8');

const browser = await launchBrowser();
const page = await browser.newPage();
await page.setViewport({ width: 1800, height: 1200, deviceScaleFactor: 1 });
await page.goto(`file://${file.replace(/\\/g, '/')}`, { waitUntil: 'load' });
await page.screenshot({ path: path.join(OUT, '_sheet.png'), type: 'png', fullPage: true });
console.log(`لوحة تجميعية لـ ${files.length} صورة: ${path.join(OUT, '_sheet.png')}`);
await closeBrowser(browser);
process.exit(0);
