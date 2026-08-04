// توليد صفحة HTML كاملة للبوستر بمقياس 1:10 (مليمتر في الملف = سنتيمتر على اللوحة النهائية).
// النص يبقى نصاً حقيقياً فيخرج متجهياً في ملف PDF ويُكبَّر بلا أي فقد للجودة.

import { editions } from './content.js';
import { themes, figureColors } from './themes.js';
import { patternLayer, khatam, cornerFlourish } from './ornaments.js';
import { figure as figureSvg } from './figures.js';

// مقاسات القص بالمليمتر عند مقياس 1:10
export const SIZES = {
  landscape: { trimW: 400, trimH: 300, label: '4x3', realW: 4000, realH: 3000 },
  portrait: { trimW: 300, trimH: 400, label: '3x4', realW: 3000, realH: 4000 },
};

// عمود الطيف في النسخ المصوّرة: عرضه بالمليمتر، والفاصل بينه وبين عمود النص،
// ونسبة عرضه إلى ارتفاعه (يمتدّ من صف آية الصدارة إلى أسفل لوحتي الأدلة).
export const FIGURE_COLUMN = {
  landscape: { width: 90, gap: 7, aspect: 90 / 163.5 },
  portrait: { width: 78, gap: 6, aspect: 78 / 234.4 },
};

export const BLEED = 5; // 5 مم في التخطيط = 50 مم على اللوحة
export const SAFE = 20; // 20 مم في التخطيط = 200 مم على اللوحة

// التخطيط مكتوب بمقياس 1:10، ثم يُكبَّر بمقدار RENDER_SCALE قبل التصدير.
// السبب: كروميوم يحوّل التدرّجات اللونية والظلال إلى طبقات نقطية بدقة الصفحة،
// فكلما كبرت الصفحة الفعلية ارتفعت دقّة تلك الطبقات. القيمة 4 تعطي ملفاً بمقياس 1:2.5.
export const RENDER_SCALE = 4;

const ARABIC_RANGE =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFF,U+102E0-102FB,U+10E60-10E7E,U+1EE00-1EEFF';
const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

/**
 * @param {(file: string) => string|null} url دالة تُرجع رابط ملف الخط أو null إن لم يوجد
 */
function fontFaces(url) {
  const faces = [];
  const add = (family, weight, file, range) => {
    const href = url(file);
    if (href) {
      faces.push(
        `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url("${href}") format('woff2');unicode-range:${range}}`,
      );
    }
  };
  for (const w of [400, 600, 700, 900]) {
    add('Cairo', w, `cairo-arabic-${w}-normal.woff2`, ARABIC_RANGE);
    add('Cairo', w, `cairo-latin-${w === 600 ? 700 : w}-normal.woff2`, LATIN_RANGE);
  }
  for (const w of [600, 700]) {
    add('Reem Kufi', w, `reem-kufi-arabic-${w}-normal.woff2`, ARABIC_RANGE);
    add('Reem Kufi', w, `reem-kufi-latin-${w}-normal.woff2`, LATIN_RANGE);
  }
  for (const w of [400, 700]) {
    add('Amiri', w, `amiri-arabic-${w}-normal.woff2`, ARABIC_RANGE);
    add('Amiri', w, `amiri-latin-${w}-normal.woff2`, LATIN_RANGE);
  }
  return faces.join('\n');
}

function cropMarks(pageW, pageH) {
  const b = BLEED;
  const len = b - 1.2;
  const x2 = pageW - b;
  const y2 = pageH - b;
  const seg = [];
  for (const x of [b, x2]) {
    seg.push(`M${x} 0 V${len}`, `M${x} ${pageH} V${pageH - len}`);
  }
  for (const y of [b, y2]) {
    seg.push(`M0 ${y} H${len}`, `M${pageW} ${y} H${pageW - len}`);
  }
  return `<svg class="cropmarks" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" preserveAspectRatio="none">
    <path d="${seg.join(' ')}" stroke="#8a8a8a" stroke-width="0.25" fill="none"/>
  </svg>`;
}

function fitBox(cls, inner, { max, min = 2.4, extra = '' } = {}) {
  return `<div class="${cls} fitbox" data-fit data-max="${max}" data-min="${min}" ${extra}><div class="fit">${inner}</div></div>`;
}

export function renderPoster({
  editionId = 'hukm',
  themeId = 'mahib',
  orientation = 'landscape',
  fontUrl = () => null,
  renderScale = RENDER_SCALE,
} = {}) {
  const content = editions[editionId];
  const t = themes[themeId];
  const size = SIZES[orientation];
  const pageW = size.trimW + BLEED * 2;
  const pageH = size.trimH + BLEED * 2;
  const sheetW = pageW * renderScale;
  const sheetH = pageH * renderScale;
  const isLand = orientation === 'landscape';
  const hasSplit = Boolean(t.split);
  const s = t.split || {};
  const hasFigure = Boolean(content.figure);
  const col = FIGURE_COLUMN[orientation];

  // أنصبة الصفوف المرنة: الصدارة، العنوان، الصيحة، الحكم، اللوحتان، الخطوات، الخاتمة.
  // في النسخ المصوّرة يضيق عمود النص، فيُعطى العنوان نصيباً أكبر من الارتفاع تعويضاً.
  //
  // ونصيبُ الخطوات موسَّعٌ على حساب العنوان والخاتمة دون لوحتَي الأدلة: سطرُ العنوان
  // محدودٌ بعرضه لا بارتفاعه فيتنازل عن فراغٍ لا ينفعه، وصفُّ الخاتمة يفضُل عن حاجته
  // لأنّ نصّه سطرٌ واحد يبلغ سقفَ حجمه قبل أن يبلغ حدَّ الصندوق. فتبقى أحجام الآيات كما هي.
  const fr = isLand
    ? hasFigure
      ? [0.5, 3.02, 0.66, 0.86, 2.6, 1.17, 0.63]
      : [0.55, 2.54, 0.7, 0.86, 2.8, 1.17, 0.63]
    : hasFigure
      ? [0.44, 3.24, 0.62, 0.95, 4.1, 1.96, 0.55]
      : [0.48, 2.84, 0.66, 0.95, 4.4, 1.96, 0.55];

  // التذييل ثلاثون مليمتراً في الاتجاهين يملؤها الوسمُ وحده فيقرأ من بعيد
  const footH = 30;
  const rows = `${isLand ? 22 : 24}mm ${fr.map((v) => `${v.toFixed(2)}fr`).join(' ')} ${footH}mm`;

  const head = content.headline[orientation];
  const headlineHtml = [
    ...head.lead.map((line) => `<div class="hl-line hl-lead">${line}</div>`),
    ...head.key.map((line) => `<div class="hl-line hl-key">${line}</div>`),
  ].join('');

  const panelsHtml = content.panels
    .map(
      (p) => `<section class="panel">
        <div class="p-label"><span class="p-dot">${khatam({ strokeWidth: 6, filled: false })}</span>${p.label}</div>
        ${fitBox('p-quote', `<span class="${p.script === 'quran' ? 'quran' : 'hadith'}">${p.quote}</span>`, { max: isLand ? 9.5 : 9.0, min: 2.6 })}
        <div class="p-ref">${p.ref}</div>
        ${fitBox('p-note', p.note, { max: 4.6, min: 2.2 })}
      </section>`,
    )
    .join('');

  const stepsHtml = content.steps
    .map((step) => `<li><span class="s-dot">${khatam({ strokeWidth: 7, filled: true })}</span><span class="s-txt">${step}</span></li>`)
    .join('');

  // القائمة تُقاس كسائر الكتل، فيكبر خطّها إلى أقصى ما يسع الصفّ ويحذّر البناء إن ضاق
  const stepsBody = `<div class="s-body fitbox" data-fit data-max="8" data-min="3.6"><ul class="fit">${stepsHtml}</ul></div>`;

  const footInner = `<span class="f-cta">${content.footer.callToAction}</span>
        <div class="f-hash-row">
          <span class="f-rule"></span>
          <span class="f-orn">${khatam({ strokeWidth: 6, filled: true })}</span>
          <div class="f-hash-box fitbox" data-fit data-max="${isLand ? 22 : 20}" data-min="8">
            <div class="fit f-hash">${content.hashtag}</div>
          </div>
          <span class="f-orn">${khatam({ strokeWidth: 6, filled: true })}</span>
          <span class="f-rule"></span>
        </div>`;

  const patternMain = patternLayer('girih-main', { ...t.pattern, tile: isLand ? 46 : 42 });
  const patternSplit = hasSplit ? patternLayer('girih-split', { ...s.pattern, tile: isLand ? 46 : 42 }) : '';

  const corner = (pos, color) =>
    `<span class="corner corner-${pos}" style="color:${color}">${cornerFlourish({ strokeWidth: 2 })}</span>`;

  const css = `
${fontFaces(fontUrl)}

*{margin:0;padding:0;box-sizing:border-box}
@page{size:${sheetW}mm ${sheetH}mm;margin:0}
html,body{width:${sheetW}mm;height:${sheetH}mm;overflow:hidden;background:#ffffff}
body{
  position:relative;
  direction:rtl;
  font-family:'Cairo','Dubai','Segoe UI',sans-serif;
  font-feature-settings:'liga' 1,'calt' 1;
  text-rendering:geometricPrecision;
  -webkit-font-smoothing:antialiased;
}

.page{
  position:absolute;top:0;left:0;
  transform:scale(${renderScale});transform-origin:top left;
  width:${pageW}mm;height:${pageH}mm;
  overflow:hidden;
  background:${t.bg};
  --ink:${t.ink};
  --ink-soft:${t.inkSoft};
  --accent:${t.accent};
  --accent-deep:${t.accentDeep};
  --accent-soft:${t.accentSoft};
  --hair:${t.hair};
  --panel-bg:${t.panelBg};
  --panel-border:${t.panelBorder};
  color:var(--ink);
}
.orn-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.glow{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(58% 42% at 50% ${isLand ? '34%' : '30%'}, ${t.glow} 0%, rgba(0,0,0,0) 70%);
}
.vignette{
  position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.34) 100%);
}

/* منطقة النور السفلية في نسخة التقابل */
.splitband{
  position:absolute;left:0;right:0;bottom:0;
  height:var(--split-h, 33%);
  background:${s.bg || 'none'};
  overflow:hidden;
}
.split-edge{
  position:absolute;left:0;right:0;top:0;height:1.6mm;
  background:linear-gradient(90deg, ${t.accentDeep}, ${t.accent} 45%, ${t.accentSoft} 50%, ${t.accent} 55%, ${t.accentDeep});
}
.on-light{
  --ink:${s.ink || t.ink};
  --ink-soft:${s.inkSoft || t.inkSoft};
  --accent:${s.accent || t.accent};
  --accent-deep:${s.accentDeep || t.accentDeep};
  --accent-soft:${s.accentDeep || t.accentSoft};
  --hair:${s.hair || t.hair};
  --panel-border:${s.panelBorder || t.panelBorder};
  color:var(--ink);
}

.trim{position:absolute;left:${BLEED}mm;top:${BLEED}mm;width:${size.trimW}mm;height:${size.trimH}mm}
.framerule{position:absolute;inset:9mm;border:0.45mm solid var(--hair);pointer-events:none}
.corner{position:absolute;width:26mm;height:26mm;pointer-events:none}
.corner svg{width:100%;height:100%;display:block}
.corner-tl{top:7mm;left:7mm}
.corner-tr{top:7mm;right:7mm;transform:rotate(90deg)}
.corner-br{bottom:7mm;right:7mm;transform:rotate(180deg)}
.corner-bl{bottom:7mm;left:7mm;transform:rotate(270deg)}
.splitband .corner-br{bottom:${BLEED + 7}mm;right:${BLEED + 7}mm}
.splitband .corner-bl{bottom:${BLEED + 7}mm;left:${BLEED + 7}mm}

.safe{
  position:absolute;inset:${SAFE}mm;
  display:grid;
  grid-template-rows:${rows};
  ${hasFigure ? `grid-template-columns:1fr ${col.width}mm;column-gap:${col.gap}mm;` : ''}
  row-gap:${isLand ? 2.6 : 3.2}mm;
}
.safe > *{min-height:0;min-width:0;overflow:hidden;position:relative}

/* المواضع مصرّح بها صراحةً حتى لا يختلف الترتيب بين تخطيطَي العمود والعمودين */
.hdr{grid-row:1}
.kicker{grid-row:2}
.headline{grid-row:3}
.cry{grid-row:4}
.ruling{grid-row:5}
.panels{grid-row:6}
.steps{grid-row:7}
.repent{grid-row:8}
.foot{grid-row:9}
${
  hasFigure
    ? `.safe > *{grid-column:1}
.hdr,.steps,.repent,.foot{grid-column:1 / -1}
.figure{grid-column:2;grid-row:2 / 7;display:flex;align-items:flex-end;justify-content:center}
.figure svg{width:100%;height:100%;display:block}`
    : ''
}

.fitbox{display:flex;align-items:center;justify-content:center}
.fit{width:100%;text-align:center}

/* ترويسة */
.hdr{
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:0.4mm solid var(--hair);
  font-size:4.4mm;font-weight:700;letter-spacing:0.02em;
  color:var(--accent-soft);
}
.hdr .mark{display:flex;align-items:center;gap:2.4mm}
.hdr .mark svg{width:6.4mm;height:6.4mm;color:var(--accent)}
.hdr .left{color:var(--ink-soft);font-weight:600}

/* آية التعظيم */
.kicker .fit{font-family:'Amiri',serif;font-weight:700;color:var(--accent-soft);line-height:1.5}
.kicker .k-ref{
  font-family:'Cairo',sans-serif;font-weight:600;font-size:0.42em;
  color:var(--ink-soft);vertical-align:middle;padding-inline-start:1.5mm;
}

/* العنوان */
.headline{display:flex;align-items:center;justify-content:center}
.headline .fit{line-height:1.34}
.hl-line{white-space:nowrap;font-weight:900;letter-spacing:-0.005em}
.hl-lead{
  font-size:0.46em;color:${t.headlineTop};opacity:0.92;
  line-height:1.22;
}
.hl-key{
  font-size:1em;color:var(--ink);
  text-shadow:0 0.9mm 1.6mm ${t.headlineShadow};
}
.hl-key em{
  font-style:normal;color:${t.headlineKey};
  text-shadow:0 0.9mm 1.6mm ${t.headlineShadow};
}

/* صيحة الحملة */
.cry{display:flex;align-items:center;justify-content:center;gap:3mm}
.cry .fit{
  font-weight:900;line-height:1.3;
  color:var(--accent);white-space:nowrap;
}
.cry .cry-dot{width:5mm;height:5mm;flex:0 0 auto;color:var(--accent-deep)}
.cry .cry-dot svg{width:100%;height:100%;display:block}

/* الحكم */
.ruling{padding:0 4mm}
.ruling .fit{font-weight:700;line-height:1.42;color:var(--ink)}

/* اللوحتان */
.panels{
  display:grid;
  grid-template-columns:${isLand ? '1fr 1fr' : '1fr'};
  grid-template-rows:${isLand ? '1fr' : '1fr 1fr'};
  gap:${isLand ? '6mm' : '4mm'};
}
.panel{
  display:flex;flex-direction:column;min-height:0;overflow:hidden;
  background:var(--panel-bg);
  border:0.4mm solid var(--panel-border);
  border-radius:2.4mm;
  padding:${isLand ? '4mm 5mm 3.4mm' : '3.4mm 5mm 3mm'};
  gap:1.6mm;
}
.p-label{
  display:flex;align-items:center;gap:2mm;
  font-size:4.2mm;font-weight:700;color:var(--accent);
  letter-spacing:0.01em;flex:0 0 auto;
}
.p-dot{width:4.6mm;height:4.6mm;flex:0 0 auto}
.p-dot svg{width:100%;height:100%;display:block}
.p-quote{flex:1 1 auto;min-height:0;overflow:hidden}
/* في الاتجاه الرأسي نضيّق سطر الاقتباس ليلتفّ ويكبر خطّه بدل بقاء فراغ رأسي */
.p-quote .fit{line-height:1.62;color:var(--ink);width:${isLand ? 100 : 84}%;margin-inline:auto}
.p-quote .quran{font-family:'Amiri',serif;font-weight:700}
.p-quote .hadith{font-family:'Amiri',serif;font-weight:400}
.p-ref{
  flex:0 0 auto;text-align:center;font-size:3.6mm;font-weight:700;
  color:var(--accent-soft);opacity:0.95;
}
.p-note{flex:0 0 auto;height:${isLand ? 8 : 7}mm}
.p-note .fit{color:var(--ink-soft);font-weight:600;line-height:1.5}
.p-note .quran{font-family:'Amiri',serif;font-weight:700;color:var(--accent-soft)}

/* الخطوات العملية */
.steps{display:flex;flex-direction:column;justify-content:center;gap:1.6mm}
.steps .s-head{
  display:flex;align-items:center;gap:2.4mm;
  font-size:4.8mm;font-weight:800;color:var(--accent);flex:0 0 auto;
}
/* جسم القائمة يأخذ ما بقي من الصفّ، فيقيس البحثُ الثنائي أكبر حجمٍ يسع البنود الثلاثة */
.s-body{flex:1 1 auto;min-height:0}
.s-body .fit{width:100%}
.steps .s-head::after{content:'';flex:1;height:0.35mm;background:var(--hair)}
.steps ul{
  list-style:none;display:flex;flex-direction:${isLand ? 'row' : 'column'};
  gap:${isLand ? '5mm' : '2.2mm'};align-items:stretch;flex:0 0 auto;
}
.steps li{
  flex:1 1 0;display:flex;align-items:center;gap:2.2mm;
  ${
    isLand
      ? 'border-inline-start:0.4mm solid var(--hair);padding-inline-start:2.4mm;'
      : 'border-top:0.35mm solid var(--hair);padding-top:2mm;'
  }
}
.steps li:first-child{${isLand ? 'border-inline-start:none;padding-inline-start:0' : 'border-top:none;padding-top:0'}}
/* الخاتم والنصّ بوحدة em ليكبرا معاً تحت قياس الملاءمة، فلا يبقى الخاتم نقطةً ضائعة بجانب سطرٍ عريض */
.s-dot{width:0.85em;height:0.85em;flex:0 0 auto;color:var(--accent)}
.s-dot svg{width:100%;height:100%;display:block}
.s-txt{font-weight:700;font-size:1em;line-height:1.3;color:var(--ink)}

/* باب التوبة */
.repent{display:flex;align-items:center;justify-content:center;gap:3mm;padding:0 3mm}
.repent .r-label{
  flex:0 0 auto;font-weight:900;line-height:1.18;
  font-size:${isLand ? 6.2 : 5.6}mm;color:var(--accent);
  border:0.45mm solid var(--accent);border-radius:1.6mm;
  padding:1.4mm 3mm;white-space:nowrap;
}
.repent .r-text{flex:1 1 auto;min-width:0;height:100%}
.repent .r-text .fit{
  text-align:start;font-weight:600;line-height:1.36;color:var(--ink);
}

/* التذييل: سطرُ دعوةٍ ثم وسمُ الحملة كبيراً في الوسط محفوفاً بخاتمَين */
.foot{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:1mm;
  border-top:0.5mm solid var(--hair);
  padding-top:2.4mm;
}
.f-cta{font-size:4.2mm;font-weight:700;color:var(--ink-soft);letter-spacing:0.02em}
.f-hash-row{
  display:flex;align-items:center;justify-content:center;gap:3.4mm;
  width:100%;flex:1 1 auto;min-height:0;
}
.f-orn{width:6mm;height:6mm;flex:0 0 auto;color:var(--accent-deep)}
.f-orn svg{width:100%;height:100%;display:block}
/* الخيط يمتدّ إلى حدّ المساحة الآمنة فيصل الخاتمَين بالوسم، فلا يبقيان معلّقَين في الفراغ */
.f-rule{flex:1 1 auto;height:0.4mm;background:var(--hair)}
/* عرضٌ صريح لصندوق القياس: لو تُرك للمحتوى لبلغ البحثُ الثنائي سقفَه بلا قياسٍ حقيقي */
.f-hash-box{flex:0 0 64%;min-width:0;height:100%}
.f-hash{
  font-family:'Reem Kufi',sans-serif;font-weight:700;
  line-height:1.14;color:var(--accent);
  white-space:nowrap;letter-spacing:-0.035em;
}

.cropmarks{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
`;

  const fitScript = `
function fitAll(){
  var report = [];
  var boxes = document.querySelectorAll('[data-fit]');
  for (var i=0;i<boxes.length;i++){
    var box = boxes[i];
    var el = box.querySelector('.fit') || box;
    var min = parseFloat(box.dataset.min), max = parseFloat(box.dataset.max);
    var lo = min, hi = max;
    for (var k=0;k<26;k++){
      var mid = (lo+hi)/2;
      el.style.fontSize = mid.toFixed(4)+'mm';
      var fits = (el.scrollWidth <= box.clientWidth + 0.6) && (el.scrollHeight <= box.clientHeight + 0.6);
      if (fits) { lo = mid; } else { hi = mid; }
    }
    el.style.fontSize = lo.toFixed(4)+'mm';
    var overflows = (el.scrollWidth > box.clientWidth + 0.6) || (el.scrollHeight > box.clientHeight + 0.6);
    report.push({
      box: box.className.replace(' fitbox','').trim(),
      mm: Math.round(lo*100)/100,
      boxH: Math.round(box.clientHeight/3.7795*10)/10,
      atMin: lo <= min + 0.05,
      overflows: overflows
    });
  }
  // حدّ منطقة النور يقع في منتصف الفراغ بين لوحتي الأدلة وصف الخطوات
  var band = document.querySelector('.splitband');
  var anchor = document.querySelector('.steps');
  var above = document.querySelector('.panels');
  if (band && anchor && above){
    // getBoundingClientRect يُرجع إحداثيات بعد التكبير، فنقسم على معامل التكبير
    var page = document.querySelector('.page').getBoundingClientRect();
    var edge = (above.getBoundingClientRect().bottom + anchor.getBoundingClientRect().top) / 2;
    band.style.height = ((page.bottom - edge) / ${renderScale}) + 'px';
  }
  document.documentElement.setAttribute('data-fitted','1');
  return report;
}
window.__fitAll = fitAll;
`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${content.hashtag} — ${content.name} — ${t.name} ${size.label}</title>
<style>${css}</style>
</head>
<body>
<div class="page">
  ${patternMain}
  <div class="glow"></div>
  ${
    hasSplit
      ? `<div class="splitband on-light">${patternSplit}<div class="split-edge"></div>${corner('br', 'var(--accent)')}${corner('bl', 'var(--accent)')}</div>`
      : ''
  }
  <div class="vignette"></div>

  <div class="trim">
    ${hasSplit ? '' : '<div class="framerule"></div>'}
    ${corner('tl', 'var(--accent)')}
    ${corner('tr', 'var(--accent)')}
    ${hasSplit ? '' : corner('br', 'var(--accent)')}
    ${hasSplit ? '' : corner('bl', 'var(--accent)')}

    <div class="safe">
      <header class="hdr">
        <span class="mark">${khatam({ strokeWidth: 6 })}<span>${content.header.right}</span></span>
        <span class="left">${content.header.left}</span>
      </header>

      ${fitBox(
        'kicker',
        `${content.kicker.text}<span class="k-ref">${content.kicker.ref}</span>`,
        { max: isLand ? 9 : 8, min: 3 },
      )}

      <div class="headline fitbox" data-fit data-max="${isLand ? 52 : 40}" data-min="8">
        <div class="fit">${headlineHtml}</div>
      </div>

      <div class="cry">
        <span class="cry-dot">${khatam({ strokeWidth: 7, filled: true })}</span>
        <div class="fitbox" data-fit data-max="${isLand ? 14 : 12}" data-min="4" style="flex:1 1 auto;min-width:0;height:100%">
          <div class="fit">${content.cry}</div>
        </div>
        <span class="cry-dot">${khatam({ strokeWidth: 7, filled: true })}</span>
      </div>

      ${fitBox('ruling', content.ruling, { max: isLand ? 10 : 9, min: 3 })}

      <div class="panels">${panelsHtml}</div>

      ${hasFigure ? `<div class="figure">${figureSvg(content.figure, { ...figureColors(t, content.figure), aspect: col.aspect })}</div>` : ''}

      <div class="steps${hasSplit ? ' on-light' : ''}">
        <div class="s-head"><span>${content.stepsLabel}</span></div>
        ${stepsBody}
      </div>

      <div class="repent${hasSplit ? ' on-light' : ''}">
        <span class="r-label">${content.repentance.label}</span>
        <div class="r-text fitbox" data-fit data-max="${isLand ? 9 : 8.4}" data-min="2.6">
          <div class="fit">${content.repentance.text}</div>
        </div>
      </div>

      <footer class="foot${hasSplit ? ' on-light' : ''}">
        ${footInner}
      </footer>
    </div>
  </div>

  ${cropMarks(pageW, pageH)}
</div>
<script>${fitScript}</script>
</body>
</html>`;
}

export default renderPoster;
