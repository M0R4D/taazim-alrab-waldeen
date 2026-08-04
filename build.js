// يولّد بوسترات الحملة: PDF متجهي + PNG عالي الدقة لكل نسخة رسائل واتجاه بصري واتجاه صفحة.
// يشغّل متصفح Edge المثبّت على الجهاز عبر puppeteer-core (بلا تنزيل Chromium).
//
// رايات التشغيل:
//   ONLY=ghadab-mahib   يبني ما يطابق اسمه هذا الجزء فقط
//   SKIP_PDF=1          يتخطّى ملفات PDF (بناء أسرع أثناء الضبط البصري)
//   SKIP_PNG=1          يتخطّى صور PNG بالمقاس الكامل ويبقي صور المعاينة
//   DEBUG_FIT=1         يطبع جدول أحجام الخطوط الناتجة عن خوارزمية الملاءمة

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderPoster, SIZES, BLEED, RENDER_SCALE } from './src/poster.js';
import { themes, themeIds } from './src/themes.js';
import { editions, editionIds } from './src/content.js';
import { launchBrowser, closeBrowser } from './src/browser.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'output');
const RENDER = path.join(OUT, '_render');
const FONTS = path.join(ROOT, 'fonts');

const PX_PER_MM = 96 / 25.4;
const PNG_SCALE = Number(process.env.PNG_SCALE || 1);
const PREVIEW_WIDTH = Number(process.env.PREVIEW_WIDTH || 1040); // عرض صورة المعاينة بالبكسل
const ONLY = process.env.ONLY || '';
const HASHTAG = editions[editionIds[0]].hashtag;

const FONT_SOURCES = [
  ['@fontsource/cairo', ['cairo-arabic-400-normal.woff2', 'cairo-arabic-600-normal.woff2', 'cairo-arabic-700-normal.woff2', 'cairo-arabic-900-normal.woff2', 'cairo-latin-400-normal.woff2', 'cairo-latin-700-normal.woff2', 'cairo-latin-900-normal.woff2']],
  ['@fontsource/reem-kufi', ['reem-kufi-arabic-600-normal.woff2', 'reem-kufi-arabic-700-normal.woff2', 'reem-kufi-latin-600-normal.woff2', 'reem-kufi-latin-700-normal.woff2']],
  ['@fontsource/amiri', ['amiri-arabic-400-normal.woff2', 'amiri-arabic-700-normal.woff2', 'amiri-latin-400-normal.woff2', 'amiri-latin-700-normal.woff2']],
];

/** ينسخ ملفات الخطوط من node_modules إلى مجلد fonts ويعيد خريطة base64 لتضمينها في الصفحة */
function collectFonts() {
  fs.mkdirSync(FONTS, { recursive: true });
  const embedded = new Map();
  let missing = 0;
  for (const [pkg, files] of FONT_SOURCES) {
    for (const file of files) {
      const src = path.join(ROOT, 'node_modules', pkg, 'files', file);
      if (!fs.existsSync(src)) {
        missing++;
        continue;
      }
      const dest = path.join(FONTS, file);
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
      embedded.set(file, `data:font/woff2;base64,${fs.readFileSync(dest).toString('base64')}`);
    }
  }
  if (embedded.size === 0) {
    console.warn('تحذير: لم تُوجد خطوط @fontsource، سيُستخدم خط Dubai المثبّت على النظام.');
  } else if (missing) {
    console.warn(`تنبيه: ${missing} ملف خط غير موجود، سيُعتمد على البدائل في سلسلة الخطوط.`);
  }
  return embedded;
}

const locked = [];

/**
 * يكتب مُخرَجاً ويتجاوّز قفلَ الملفّ إن كان مفتوحاً في عارضٍ آخر، مع إبقاء النسخة القديمة.
 * فبناءُ ستٍّ وتسعين نسخةً يطول، ولا يصحّ أن يُسقِطَه ملفٌّ واحدٌ مفتوحٌ في أثنائه.
 */
async function writeGuarded(label, write) {
  try {
    await write();
  } catch (err) {
    const busy = ['EBUSY', 'EPERM', 'EACCES'].includes(err.code) || /EBUSY|EPERM|EACCES/.test(err.message || '');
    if (!busy) throw err;
    locked.push(label);
    console.warn(`  تحذير: ${label} مقفولٌ في برنامجٍ آخر، أُبقيت النسخةُ القديمة وتابعَ البناء.`);
  }
}

function variants() {
  const list = [];
  for (const editionId of editionIds) {
    for (const themeId of themeIds) {
      for (const orientation of Object.keys(SIZES)) {
        const name = `taazim-${editionId}-${themeId}-${SIZES[orientation].label}`;
        if (ONLY && !name.includes(ONLY)) continue;
        list.push({ editionId, themeId, orientation, name });
      }
    }
  }
  return list;
}

function writePreviewSheet(items) {
  const sections = editionIds
    .map((id) => {
      const group = items.filter((it) => it.editionId === id);
      if (!group.length) return '';
      const ed = editions[id];
      const cards = group
        .map(
          (it) => `    <figure>
      <img src="${it.previewFile}" alt="${it.title}">
      <figcaption>
        <strong>${it.title}</strong>
        <span>${it.real}</span>
        <span><a href="${it.pdfFile}">PDF متجهي</a> • <a href="${it.pngFile}">PNG ${it.px}</a></span>
      </figcaption>
    </figure>`,
        )
        .join('\n');
      return `<section>
  <h2>نسخة «${ed.name}»</h2>
  <p class="sub">${ed.cry}${ed.figure ? ' • بطيفٍ بشري' : ''}</p>
  <div class="grid">
${cards}
  </div>
</section>`;
    })
    .join('\n');

  // العدّ محسوب من الحصيلة نفسها، فيصدق مع البناء الكامل ومع ONLY على السواء
  const counted = (key) => new Set(items.map((it) => it[key])).size;
  // تمييز العدد: ما بين الثلاثة والعشرة يُجمَع، وما جاوز العشرة يُفرَد
  const say = (n, few, many) => `${n} ${n >= 3 && n <= 10 ? few : many}`;
  const pages = counted('orientation');
  const matrix = `${say(counted('editionId'), 'نُسَخ رسائل', 'نسخةَ رسائل')} × ${say(
    counted('themeId'),
    'اتجاهات بصرية',
    'اتجاهاً بصرياً',
  )} × ${pages === 2 ? 'اتجاهَي صفحة' : say(pages, 'اتجاهات صفحة', 'اتجاهَ صفحة')}`;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>معاينة بوسترات ${HASHTAG}</title>
<style>
  body{margin:0;padding:32px;background:#12141a;color:#e9edf5;font-family:'Dubai','Segoe UI',sans-serif}
  h1{font-size:26px;margin:0 0 6px}
  h2{font-size:20px;margin:0 0 4px;color:#e8bd66}
  section{margin:0 0 40px}
  p.sub{margin:0 0 20px;color:#9aa5bb;font-size:14px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:26px}
  figure{margin:0;background:#1b1e27;border:1px solid #2b303d;border-radius:10px;overflow:hidden}
  img{display:block;width:100%;height:auto;background:#000}
  figcaption{padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:13px;color:#9aa5bb}
  figcaption strong{color:#e9edf5;font-size:15px}
  a{color:#e8bd66}
</style>
</head>
<body>
<h1>بوسترات حملة ${HASHTAG}</h1>
<p class="sub">${items.length} بوستراً: ${matrix}. ملفات PDF متجهية جاهزة للطباعة بالمقاس الكامل.</p>
${sections}
</body>
</html>`;
  fs.writeFileSync(path.join(OUT, 'preview.html'), html, 'utf8');

  // نسخة الجذر لصفحات GitHub، ومسارات ملفاتها مسبوقة باسم مجلّد المخرجات
  const rootHtml = html.replace(/(src|href)="(taazim-)/g, '$1="output/$2');
  fs.writeFileSync(path.join(ROOT, 'index.html'), rootHtml, 'utf8');
}

async function main() {
  fs.mkdirSync(RENDER, { recursive: true });
  const fonts = collectFonts();
  const fontUrl = (file) => fonts.get(file) || null;

  const browser = await launchBrowser();

  const items = [];
  try {
    for (const v of variants()) {
      const size = SIZES[v.orientation];
      const sheetW = (size.trimW + BLEED * 2) * RENDER_SCALE;
      const sheetH = (size.trimH + BLEED * 2) * RENDER_SCALE;
      const vw = Math.floor(sheetW * PX_PER_MM);
      const vh = Math.floor(sheetH * PX_PER_MM);
      const dpiAtFullSize = ((vw * PNG_SCALE) / (size.realW / 25.4)).toFixed(1);

      const html = renderPoster({
        editionId: v.editionId,
        themeId: v.themeId,
        orientation: v.orientation,
        fontUrl,
      });
      const htmlPath = path.join(RENDER, `${v.name}.html`);
      fs.writeFileSync(htmlPath, html, 'utf8');

      const page = await browser.newPage();
      await page.setViewport({ width: vw, height: vh, deviceScaleFactor: PNG_SCALE });
      await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const report = await page.evaluate(() => window.__fitAll());
      if (process.env.DEBUG_FIT) console.table(report);
      const problems = report.filter((r) => r.overflows || r.atMin);
      for (const p of problems) {
        console.warn(
          `  تحذير [${v.name}] ${p.box}: حجم الخط ${p.mm}مم، ارتفاع الصندوق ${p.boxH}مم${p.overflows ? ' — النص يتجاوز الصندوق' : ' — بلغ الحد الأدنى'}`,
        );
      }

      const pngFile = `${v.name}.png`;
      if (!process.env.SKIP_PNG) {
        await writeGuarded(pngFile, () =>
          page.screenshot({ path: path.join(OUT, pngFile), type: 'png', captureBeyondViewport: false }),
        );
      }

      await page.setViewport({ width: vw, height: vh, deviceScaleFactor: PREVIEW_WIDTH / vw });
      const previewFile = `${v.name}-preview.png`;
      await writeGuarded(previewFile, () =>
        page.screenshot({ path: path.join(OUT, previewFile), type: 'png', captureBeyondViewport: false }),
      );

      const pdfFile = `${v.name}.pdf`;
      if (!process.env.SKIP_PDF) {
        await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
        await writeGuarded(pdfFile, () =>
          page.pdf({
            path: path.join(OUT, pdfFile),
            width: `${sheetW}mm`,
            height: `${sheetH}mm`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            pageRanges: '1',
          }),
        );
      }

      await page.close();

      const kb = (f) => {
        const p = path.join(OUT, f);
        return fs.existsSync(p) ? `${Math.round(fs.statSync(p).size / 1024)} KB` : '—';
      };
      items.push({
        editionId: v.editionId,
        themeId: v.themeId,
        orientation: v.orientation,
        title: `${editions[v.editionId].name} — ${themes[v.themeId].name} — ${size.label}`,
        real: `${size.realW} × ${size.realH} مم + حافة قص ${BLEED * 10} مم`,
        px: `${vw * PNG_SCALE} × ${vh * PNG_SCALE} بكسل (${dpiAtFullSize} نقطة/إنش بالمقاس الكامل)`,
        pngFile,
        pdfFile,
        previewFile,
      });
      console.log(
        `تم: ${v.name}  |  PDF ${kb(pdfFile)} (${sheetW}×${sheetH} مم)  |  PNG ${kb(pngFile)} ${vw * PNG_SCALE}×${vh * PNG_SCALE} = ${dpiAtFullSize} dpi`,
      );
    }
  } finally {
    await closeBrowser(browser);
  }

  if (!ONLY) writePreviewSheet(items);
  console.log(`\nاكتمل توليد ${items.length} نسخة في: ${OUT}`);
  if (locked.length) {
    console.warn(`\n${locked.length} ملفاً لم يُحدَّث لأنّه مقفول، أغلِقْه ثم أعِد البناء عليه وحده:`);
    for (const f of locked) console.warn(`  ${f}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
