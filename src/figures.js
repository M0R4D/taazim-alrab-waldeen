// أطياف بشرية متجهية بلا أي ملامح داخلية: لا عين ولا حاجب ولا فم مرسوم.
// الانفعال يأتي من وضعية الرأس، ومن اليد، ومن الرمز الهندسي المرافق وحده.
//
// الأنواع الستّة وجدولها في KINDS أسفل الملف:
//   anger  رأس إلى الخلف وثُلمة فم مفتوحة وقبضة، وشَرَرٌ يتطاير من الفم
//   regret رأس منحنٍ وكفٌّ على الجبهة، ومحرابُ نورٍ صاعد
//   awe    رأس مُطأطئ وكفّان مبسوطتان مرفوعتان، وستارُ نورٍ نازل
//   stand  قامة منتصبة وكفٌّ مرفوعة منكِرة، وسهامُ صوتٍ صاعدة
//   hush   رأس مستوٍ وكفٌّ تكُفُّ الفم، ونجومُ كلامٍ مرتفعة تُكتَب
//   kin    قامة كبيرة ويدٌ على كتف قامة صغيرة، وجَمَلونُ بيتٍ فوقهما

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const n = (v) => Number(v.toFixed(2));
const P = (p) => `${n(p[0])} ${n(p[1])}`;

// نصف القامة مرسوم بمقاس ثابت (نحو 362 × 650 وحدة) ويستقرّ عند قاع فضاء الرسم.
// فضاء الرسم نفسه يتشكّل حسب نسبة العمود في التخطيط، فيملؤه الرسم بلا فجوات،
// وما يفضل فوق نصف القامة يشغله الرمز الهندسي.
const BUST_H = 650;
const BUST_CX = 210; // مركز الكتلة أفقياً في إحداثياتها الأصلية
const HEAD_SCALE = 0.92; // الرأس مرسوم كبيراً قليلاً، فيُصغَّر حول قاعدة العنق
const MIN_VB_W = 390; // أضيق فضاء يسع نصف القامة (362 وحدة) بلا قصّ
const BASE_VB_H = 880; // في الأعمدة العريضة: نحو 52% للقامة والباقي للرمز
const FOOT = BUST_H + 60; // قاع الجذع، ويتجاوز حدّ فضاء الرسم فيُقَصّ

/** مسار مغلق بعرض متدرّج على امتداد سلسلة نقاط: يصلح للأذرع والأصابع بلا زوايا قائمة */
function taperedPath(pts, widths) {
  const len = pts.length;
  const normals = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(len - 1, i + 1)];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const m = Math.hypot(dx, dy) || 1;
    return [-dy / m, dx / m];
  });
  const off = (sign) =>
    pts.map((p, i) => [p[0] + sign * normals[i][0] * widths[i], p[1] + sign * normals[i][1] * widths[i]]);
  const left = off(1);
  const right = off(-1);

  const dirAt = (i, j) => {
    const [dx, dy] = [pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]];
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  const smooth = (arr) => {
    let d = '';
    for (let i = 1; i < arr.length - 1; i++) {
      const mid = [(arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2];
      d += ` Q ${P(arr[i])}, ${P(mid)}`;
    }
    return d + ` L ${P(arr[arr.length - 1])}`;
  };
  // نهاية مدوّرة: منحنى تكعيبي ينتفخ باتجاه الطرف بمقدار نصف العرض
  const cap = (from, to, dir, w) =>
    ` C ${P([from[0] + dir[0] * w * 1.34, from[1] + dir[1] * w * 1.34])}, ${P([to[0] + dir[0] * w * 1.34, to[1] + dir[1] * w * 1.34])}, ${P(to)}`;

  const rev = right.slice().reverse();
  return (
    `M ${P(left[0])}` +
    smooth(left) +
    cap(left[len - 1], right[len - 1], dirAt(len - 2, len - 1), widths[len - 1]) +
    smooth(rev) +
    cap(rev[len - 1], left[0], dirAt(1, 0), widths[0]) +
    ' Z'
  );
}

/** حدّ الوجه الجانبي: جبهة، حاجب، أنف، شفتان، ذقن، فكّ، مؤخرة الرأس. الوجه متجه يميناً. */
function headOutline({ openMouth = false } = {}) {
  const mouth = openMouth
    ? // فم مفتوح صائح: ثُلمة مثلثة داخل حدّ الوجه
      `L 252 351 C 259 352, 263 356, 259 360 L 232 370 L 258 383 C 263 389, 261 395, 253 399 L 249 404`
    : // فم مطبق: شفتان متتابعتان
      `L 252 352 C 259 353, 262 357, 258 361 C 263 366, 262 373, 254 377 L 250 382`;

  return `M 185 200
    C 225 202, 250 222, 256 255
    C 259 272, 256 283, 250 289
    L 243 297
    C 247 303, 252 309, 258 316
    L 281 339
    C 277 345, 266 347, 255 346
    ${mouth}
    C 260 387, 266 397, 258 407
    C 242 420, 214 427, 190 423
    L 152 410
    C 132 400, 121 375, 118 340
    C 114 300, 121 254, 143 227
    C 158 208, 170 200, 185 200 Z`.replace(/\s+/g, ' ');
}

/**
 * العنق والكتفان والصدر.
 * أعلى الكتف شبه مستوٍ ثم ينحدر بحدّة عند العَضُد، فلا يقرأ الجذع تلّةً مستديرة.
 * الانكسار يُنزل الكتفين ويقرّبهما من العنق.
 * القاع يتجاوز حدّ فضاء الرسم فيُقَصّ، فلا يظهر خطُّ حدٍّ أفقي أسفل الطيف.
 */
function bustBody({ slump = 0 } = {}) {
  const dy = 30 * slump;
  const dx = 18 * slump;
  return `M 150 396
    L 208 416
    C 216 448, 219 468, 218 490
    C ${246 - dx} ${498 + dy}, ${274 - dx} ${506 + dy}, ${298 - dx} ${520 + dy}
    C ${328 - dx} ${540 + dy}, 350 578, 360 650
    L 366 ${BUST_H + 60}
    L 34 ${BUST_H + 60}
    L 40 650
    C 50 578, 72 540, ${102 + dx} ${520 + dy}
    C ${126 + dx} ${506 + dy}, 142 ${498 + dy}, 148 491
    C 147 456, 148 420, 150 396 Z`.replace(/\s+/g, ' ');
}

/**
 * قبضة مشدودة: أربع عُقَد على الحدّ العلوي يفصل بينها ثَلْمٌ عميق، وإبهامٌ بارز أسفل اليسار.
 * الثَّلْم عميق عمداً (نحو ١٢ وحدة) كي يبقى ظاهراً بعد أن يبتلع حدُّ الطيف السميك بعضه،
 * فتقرأ الكتلة قبضةً من مسافة اللوحة لا كُرةً.
 */
function fistPath() {
  return `M -50 -6
    C -52 -28, -43 -42, -28 -45
    C -19 -47, -13 -43, -12 -34
    C -9 -45, 0 -50, 9 -47
    C 15 -45, 17 -40, 16 -33
    C 20 -44, 30 -48, 38 -44
    C 43 -41, 45 -37, 44 -30
    C 49 -39, 58 -38, 61 -28
    C 64 -18, 63 -4, 59 10
    C 54 29, 43 43, 27 50
    C 9 58, -14 56, -29 46
    C -37 41, -43 33, -46 23
    C -57 22, -64 12, -60 1
    C -58 -4, -54 -6, -50 -6 Z`.replace(/\s+/g, ' ');
}

/**
 * كفّ يقبض على الجبهة: راحة وأربعة أصابع متلاصقة منحنية إلى الخلف.
 * تلاصُق الأصابع مقصود؛ لو تباعدت لقُرِئت الهيئة تلويحةَ تحية لا قبضةَ أسًى.
 * الأصابع متجهة إلى أعلى في الوضع الأصلي، والإبهام إلى اليسار.
 */
function openPalmParts({ thumb = true } = {}) {
  const palm = `M -46 6
    C -50 -18, -38 -38, -16 -44
    C 6 -50, 28 -44, 40 -28
    C 51 -12, 51 12, 40 28
    C 26 46, 0 52, -20 44
    C -37 37, -44 23, -46 6 Z`.replace(/\s+/g, ' ');
  const fingers = [
    taperedPath([[-20, -34], [-32, -64], [-42, -88]], [14, 12, 10]),
    taperedPath([[-1, -42], [-8, -76], [-16, -102]], [14, 12, 10]),
    taperedPath([[18, -40], [14, -74], [7, -100]], [14, 12, 10]),
    taperedPath([[35, -32], [35, -62], [30, -84]], [13, 11, 9]),
  ];
  // الكفّ البعيدة تُرسم بلا إبهام: الإبهام هناك مستور خلف الراحة، ولو أُظهر لقُرِئ زائدةً معلّقة
  const shapes = [palm, ...fingers];
  if (thumb) shapes.push(taperedPath([[-40, 20], [-64, 30], [-86, 26]], [17, 15, 12]));
  return shapes.map((d) => `<path d="${d}"/>`).join('');
}

// ————— أجزاء اليدين لكل نوع: تُرسم داخل مجموعة الجذع فترث حَشْوَه وحدَّه —————

/** الغَضَب: ذراعٌ ترتفع إلى الصدر وقبضةٌ مشدودة */
function fistArm() {
  return `<path d="${taperedPath(
    [
      [330, FOOT],
      [338, 556],
      [316, 494],
      [296, 460],
    ],
    [46, 40, 32, 26],
  )}"/>
       <g transform="translate(290 428) rotate(-28)"><path d="${fistPath()}"/></g>`;
}

/** النَّدَم: المرفق يبرز قليلاً خارج حدّ الجذع، فيقرأ الذراع ذراعاً لا امتداداً للصدر */
function browPalmArm() {
  return `<path d="${taperedPath(
    [
      [286, FOOT],
      [352, 560],
      [368, 456],
      [346, 384],
    ],
    [42, 35, 29, 24],
  )}"/>
       <g transform="translate(342 322) rotate(-26) scale(0.94)">${openPalmParts()}</g>`;
}

/**
 * الهَيْبة: ذراعان مرفوعتان وكفّان مبسوطتان أعلى الرأس مفتوحتان إلى الخارج،
 * فتقرأ الهيئة تعظيماً ودعاءً لا قبضاً على الرأس. ميلُ الكفَّين خارجاً هو ما يفرّق بينهما.
 * الكفّ البعيدة معكوسة أفقياً كي يبقى إبهامها متجهاً إلى داخل الرسم فلا يُقَصّ.
 */
function raisedPalms() {
  const near = taperedPath(
    [
      [300, FOOT],
      [348, 566],
      [368, 462],
      [350, 386],
    ],
    [44, 36, 30, 24],
  );
  const far = taperedPath(
    [
      [114, FOOT],
      [70, 574],
      [54, 470],
      [74, 394],
    ],
    [42, 34, 28, 22],
  );
  return `<path d="${near}"/>
       <path d="${far}"/>
       <g transform="translate(352 322) rotate(17) scale(0.86)">${openPalmParts()}</g>
       <g transform="translate(72 330) scale(-0.82 0.82) rotate(17)">${openPalmParts({ thumb: false })}</g>`;
}

/**
 * النُّصْرة: ذراع مرفوعة وكفٌّ مبسوطة إلى الأمام بارتفاع الرأس: وقفةُ إنكار.
 * الكفّ متقدّمة عن الوجه ومُميلة إلى الخارج، فلا يلتقي إبهامُها بالأنف.
 */
function objectingArm() {
  return `<path d="${taperedPath(
    [
      [316, FOOT],
      [358, 552],
      [374, 446],
      [356, 366],
    ],
    [44, 36, 30, 24],
  )}"/>
       <g transform="translate(366 292) rotate(16)">${openPalmParts()}</g>`;
}

/**
 * حِفْظُ اللِّسان: ذراع تصعد أمام النَّحْر وكفٌّ مبسوطة على الفم، أصابعُها عبر الوَجْنة والإبهام تحت الذَّقَن.
 * تُرسم فوق الرأس لا تحته (partsOnTop)، وإلا استتر الكفُّ خلف حدّ الوجه فلم يبقَ منه إلا هلال.
 */
function mouthPalmArm() {
  return `<path d="${taperedPath(
    [
      [302, FOOT],
      [348, 562],
      [342, 472],
      [306, 424],
    ],
    [44, 36, 30, 24],
  )}"/>
       <g transform="translate(268 382) rotate(-74) scale(0.86)">${openPalmParts()}</g>`;
}

const CHILD_SCALE = 0.6;
// رأس الصغير كلّه خارج حدّ جذع الكبير: لو زاحمه لقُرِئت القامتان كتلةً واحدة من مسافة اللوحة
const CHILD_DX = 250;
const CHILD_TILT = -14; // رأسٌ مرفوع إلى الكبير: يَسْمَعُ فيَحْفَظ

/**
 * التَّربية: نصف قامة صغيرة أمام الكبير، ويدُ الكبير على كتفها.
 * اليد أسفل رأس الصغير لا عليه، كي يبقى حدُّ الرأس الصغير سليماً فيُقرأ رأسَين لا رأساً واحداً.
 */
function parentChildParts() {
  const pivot = [182, 452];
  const child = `<g transform="translate(${CHILD_DX} ${n(FOOT - FOOT * CHILD_SCALE)}) scale(${CHILD_SCALE})">
         <path d="${bustBody({ slump: 0 })}"/>
         <g transform="rotate(${CHILD_TILT} ${P(pivot)}) translate(${P(pivot)}) scale(${HEAD_SCALE}) translate(${P([-pivot[0], -pivot[1]])})">
           <path d="${headOutline()}"/>
         </g>
       </g>`;
  const arm = taperedPath(
    [
      [214, 492],
      [266, 534],
      [310, 568],
    ],
    [40, 33, 26],
  );
  return `${child}
       <path d="${arm}"/>
       <g transform="translate(334 586) rotate(138) scale(0.6)">${openPalmParts()}</g>`;
}

// ————— الرموز الهندسية: تُرسم في إحداثيات فضاء الرسم لا في إحداثيات الجذع —————

/** شظايا حادّة تتطاير من موضع الفم: الكلمة الحارقة. تُرجع الرسم وحدّيه الأعلى والأيمن. */
function sparkShards({ ox, oy, count = 11, gap = 22, minLen = 62, maxLen = 200, from = -106, to = -12, seed = 9.5 }) {
  const out = [];
  let top = oy;
  let right = ox;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = ((from + (to - from) * t) * Math.PI) / 180;
    const bulge = 0.44 + 0.56 * Math.sin(Math.PI * t);
    const len = minLen + (maxLen - minLen) * bulge;
    const half = seed * (0.38 + 0.62 * bulge);
    const [dx, dy] = [Math.cos(a), Math.sin(a)];
    const [px, py] = [-dy, dx];
    const b = [ox + dx * gap, oy + dy * gap];
    const tip = [b[0] + dx * len, b[1] + dy * len];
    const kink = [b[0] + dx * len * 0.5 + px * half, b[1] + dy * len * 0.5 + py * half];
    top = Math.min(top, tip[1], kink[1]);
    right = Math.max(right, tip[0], kink[0]);
    out.push(
      `<path d="M ${P([b[0] + px * half, b[1] + py * half])} L ${P(kink)} L ${P(tip)} L ${P([b[0] - px * half, b[1] - py * half])} Z"/>`,
    );
  }
  return { html: out.join(''), top, right };
}

/** أقواس نور صاعدة على هيئة محراب: بابُ التوبة مفتوح */
function lightArcs({ cx, cy, rx, ry, count = 3, width = 8 }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const k = 1 - i * 0.21;
    out.push(
      `<path d="M ${n(cx - rx * k)} ${n(cy)} A ${n(rx * k)} ${n(ry * k)} 0 0 1 ${n(cx + rx * k)} ${n(cy)}" fill="none" stroke="currentColor" stroke-width="${n(width - i * 1.6)}" stroke-linecap="round" opacity="${(0.9 - i * 0.24).toFixed(2)}"/>`,
    );
  }
  return out.join('');
}

/** ستارُ نورٍ نازل: خطوط رأسية أطولها في الوسط، تنزل على الرأس المُطأطئ */
function lightVeil({ cx, halfW, top, bottom, count = 9, width = 9 }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = cx - halfW + 2 * halfW * t;
    const bulge = Math.sin(Math.PI * t);
    const len = (bottom - top) * (0.3 + 0.7 * bulge);
    out.push(
      `<path d="M ${n(x)} ${n(top)} V ${n(top + len)}" stroke="currentColor" stroke-width="${n(width * (0.5 + 0.5 * bulge))}" stroke-linecap="round" opacity="${(0.34 + 0.52 * bulge).toFixed(2)}"/>`,
    );
  }
  return out.join('');
}

/** سهامُ صوتٍ صاعدة: زوايا متراكبة تعلو، تكبر كلما ارتفعت. ارفَعْ صوتَك */
function risingChevrons({ cx, top, bottom, halfW, count = 4, width = 11 }) {
  const out = [];
  const step = (bottom - top) / count;
  for (let i = 0; i < count; i++) {
    const y = bottom - i * step;
    const k = 0.5 + (0.5 * (i + 1)) / count;
    const w = halfW * k;
    out.push(
      `<path d="M ${n(cx - w)} ${n(y)} L ${n(cx)} ${n(y - step * 0.72)} L ${n(cx + w)} ${n(y)}" fill="none" stroke="currentColor" stroke-width="${n(width * k)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.42 + 0.48 * ((i + 1) / count)).toFixed(2)}"/>`,
    );
  }
  return out.join('');
}

/**
 * جَمَلونُ بيتٍ مزدوج يظلّل القامتين، وعارضةٌ أفقية تشدّه: البيت أوّلُ مدرسة.
 * العارضة تكسر فراغ الأعمدة العالية وتُخرج الشكل من هيئة الخيمة إلى هيئة البيت.
 */
function gableRoof({ cx, apexY, baseY, halfW, width = 10 }) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const inset = i * 0.16;
    const w = halfW * (1 - inset);
    const apex = apexY + (baseY - apexY) * inset * 0.7;
    out.push(
      `<path d="M ${n(cx - w)} ${n(baseY)} L ${n(cx)} ${n(apex)} L ${n(cx + w)} ${n(baseY)}" fill="none" stroke="currentColor" stroke-width="${n(width - i * 3.4)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.9 - i * 0.34).toFixed(2)}"/>`,
    );
  }
  // العارضة تلتقي بالضِّلعَين تماماً عند 0.68 من الارتفاع: منخفضةً كي لا يُقرأ الشكل حرفاً لاتينياً
  const tieT = 0.68;
  const tieY = apexY + (baseY - apexY) * tieT;
  const tieW = halfW * tieT;
  out.push(
    `<path d="M ${n(cx - tieW)} ${n(tieY)} H ${n(cx + tieW)}" fill="none" stroke="currentColor" stroke-width="${n(width * 0.54)}" stroke-linecap="round" opacity="0.66"/>`,
  );
  return out.join('');
}

function starPath(cx, cy, outer, points = 8, innerRatio = 0.4142, rotation = -Math.PI / 8) {
  const inner = outer * innerRatio;
  const d = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    d.push(`${i === 0 ? 'M' : 'L'}${P([cx + rad * Math.cos(a), cy + rad * Math.sin(a)])}`);
  }
  return d.join(' ') + ' Z';
}

/** قافلةُ نجومٍ صاعدة تتضاءل: كلُّ كلمةٍ تُرفَع وتُكتَب */
function risingStars({ cx, top, bottom, drift = 34 }) {
  const span = bottom - top;
  const count = Math.max(3, Math.min(6, Math.round(span / 120)));
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const y = bottom - span * t;
    const r = 40 - 23 * t;
    out.push(`<path d="${starPath(cx - drift * t, y, r)}" opacity="${(0.95 - 0.4 * t).toFixed(2)}"/>`);
  }
  return out.join('');
}

function rotatePoint([x, y], deg, [cx, cy]) {
  const a = (deg * Math.PI) / 180;
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
}

const TOP_MARGIN = 92; // ما يبلغه الرمز الهندسي من أعلى فضاء الرسم
const MAX_SPREAD = 1.4; // أقصى تمدّد أفقي للشَّرر؛ ما فوقه يبتلع الشَّررُ الطيفَ نفسه
const MAX_STRETCH = 2.6; // أقصى تمدّد رأسي؛ ما فوقه تصير الشظايا خيوطاً لا شرراً

// ————— الرموز: كل واحد يتمدّد بقدر ما يعلو العمود ويتّسع، فلا يُقَصّ ولا يُخلي فراغاً —————

function shardsEmotion({ spark, vbW, mouth }) {
  const shards = sparkShards({ ox: mouth[0], oy: mouth[1] });
  // يتمدّد الشَّرر أفقياً بقدر ما يتّسع العمود، ورأسياً بقدر ما يعلو، فلا يُقَصّ في الحالين
  const sx = Math.min(MAX_SPREAD, (vbW - 10 - mouth[0]) / (shards.right - mouth[0]));
  const sy = Math.min(MAX_STRETCH, (mouth[1] - TOP_MARGIN) / (mouth[1] - shards.top));
  return `<g fill="${spark}" transform="translate(${P(mouth)}) scale(${n(sx)} ${n(sy)}) translate(${P([-mouth[0], -mouth[1]])})">${shards.html}</g>`;
}

function arcsEmotion({ spark, vbW, dropY }) {
  // القوس ينهض من قاع الرسم لا من مستوى الكتفين، فيصير محراباً يحتضن الطيف
  const cy = dropY + 640;
  const halo = { cx: vbW / 2, cy, rx: Math.min(vbW * 0.45, 230), ry: cy - TOP_MARGIN };
  return `<g color="${spark}">${lightArcs(halo)}</g>
       <g fill="${spark}"><path d="${starPath(halo.cx, TOP_MARGIN - 46, 30)}"/></g>`;
}

function veilEmotion({ spark, vbW, dropY }) {
  const cx = vbW / 2;
  const veil = lightVeil({
    cx,
    halfW: Math.min(vbW * 0.38, 190),
    top: TOP_MARGIN,
    bottom: dropY + 330,
  });
  return `<g color="${spark}">${veil}</g>
       <g fill="${spark}"><path d="${starPath(cx, TOP_MARGIN - 46, 30)}"/></g>`;
}

function callEmotion({ spark, vbW, dropY }) {
  const cx = vbW * 0.36;
  // القاع يبقى فوق قمّة الرأس، فلا تنزل الزوايا على الوجه ولا على الكفّ المرفوعة
  const chevrons = risingChevrons({
    cx,
    top: TOP_MARGIN + 74,
    bottom: dropY + 130,
    halfW: Math.min(vbW * 0.3, 150),
  });
  return `<g color="${spark}">${chevrons}</g>
       <g fill="${spark}"><path d="${starPath(cx, TOP_MARGIN - 6, 32)}"/></g>`;
}

function wordsEmotion({ spark, vbW, dropY }) {
  const stars = risingStars({ cx: vbW * 0.62, top: TOP_MARGIN + 10, bottom: dropY + 120 });
  return `<g fill="${spark}">${stars}</g>`;
}

function homeEmotion({ spark, vbW, dropY }) {
  const cx = vbW / 2;
  // القاعدة تنزل إلى مستوى الصدر فتقرأ جدارَين يحتضنان القامتين، وما خفي منها يُقَصّ خلف الجذع
  const roof = gableRoof({
    cx,
    apexY: TOP_MARGIN + 26,
    baseY: dropY + 340,
    halfW: vbW * 0.46,
  });
  return `<g color="${spark}">${roof}</g>
       <g fill="${spark}"><path d="${starPath(cx, TOP_MARGIN - 42, 26)}"/></g>`;
}

/**
 * جدول الأنواع: وضعيةُ الرأس والجذع، وموضع الفم مصدرَ الرمز، وأجزاءُ اليدين، والرمزُ الهندسي.
 * cxAt موضع مركز الجذع من عرض العمود، وminVbW أضيقُ فضاءٍ يسع الرسم بلا قصّ،
 * وpartsOnTop يرفع اليد فوق الرأس حيث تكون اليدُ على الوجه.
 */
const KINDS = {
  anger: { tilt: -22, slump: 0, openMouth: true, cxAt: 0.44, mouthAt: [248, 374], parts: fistArm, emotion: shardsEmotion },
  regret: { tilt: 27, slump: 1, openMouth: false, cxAt: 0.5, mouthAt: [252, 366], parts: browPalmArm, emotion: arcsEmotion },
  awe: { tilt: 22, slump: 0.45, openMouth: false, cxAt: 0.5, mouthAt: [252, 366], parts: raisedPalms, emotion: veilEmotion },
  stand: { tilt: -7, slump: 0, openMouth: false, cxAt: 0.42, mouthAt: [250, 370], parts: objectingArm, emotion: callEmotion },
  hush: { tilt: 4, slump: 0.25, openMouth: false, cxAt: 0.46, mouthAt: [250, 370], parts: mouthPalmArm, partsOnTop: true, emotion: wordsEmotion },
  kin: { tilt: 12, slump: 0.3, openMouth: false, cxAt: 0.4, mouthAt: [252, 366], minVbW: 470, parts: parentChildParts, emotion: homeEmotion },
};

export const figureKinds = Object.keys(KINDS);

/**
 * @param {'anger'|'regret'|'awe'|'stand'|'hush'|'kin'} kind
 * @param {{fill?:string, rim?:string, spark?:string, aspect?:number}} opts
 *   aspect نسبة عرض عمود الطيف إلى ارتفاعه في التخطيط
 */
export function figure(kind, { fill = '#05070f', rim = '#e8bd66', spark = '#e8903f', aspect = 0.55 } = {}) {
  const k = KINDS[kind];
  if (!k) throw new Error(`طيف غير معروف: ${kind}. المتاح: ${figureKinds.join(', ')}`);

  const vbH = Math.round(Math.max(BASE_VB_H, (k.minVbW || MIN_VB_W) / aspect));
  const vbW = Math.round(vbH * aspect);
  const dropY = vbH - BUST_H;

  const pivot = [182, 452]; // قاعدة العنق: يدور حولها الرأس فيبقى ملتحماً بالجذع
  // الغاضب يميل إلى يسار العمود ليفسح للشَّرر، والنادم يتوسّطه تحت القوس
  const shiftX = Math.round(vbW * k.cxAt - BUST_CX);

  const head = `<g transform="rotate(${k.tilt} ${P(pivot)}) translate(${P(pivot)}) scale(${HEAD_SCALE}) translate(${P([-pivot[0], -pivot[1]])})">
        <path d="${headOutline({ openMouth: k.openMouth })}"/>
      </g>`;
  // الأصل أن يعلو الرأسُ اليدَ فيستر ما دخل في حدّه، إلا حيث تكون اليدُ على الوجه نفسه
  const layers = k.partsOnTop ? [head, k.parts()] : [k.parts(), head];

  const bust = `<g transform="translate(${shiftX} 0)" fill="${fill}" stroke="${rim}" stroke-width="${n(vbW / 108)}" stroke-linejoin="round">
      <path d="${bustBody({ slump: k.slump })}"/>
      ${layers[0]}
      ${layers[1]}
    </g>`;

  // حَشْو الطيف أشدّ قتامةً من خلفية البوستر بفارق ضئيل، فلولا هذه الهالة الخافتة
  // لذاب الجذع في الخلفية ولم يبقَ منه إلا خيط الحدّ.
  // الهالة قطعٌ ناقص محصور تماماً داخل فضاء الرسم لينعدم لونه عند حدّه،
  // فلو رُسم مستطيلاً لبان له حدٌّ قاطع على الخلفيات الفاتحة.
  const auraId = `aura-${kind}-${vbW}`;
  const auraCy = dropY + 360;
  const aura = `<defs><radialGradient id="${auraId}">
      <stop offset="0%" stop-color="${spark}" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="${spark}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${spark}" stop-opacity="0"/>
    </radialGradient></defs>
    <ellipse cx="${n(vbW / 2)}" cy="${n(auraCy)}" rx="${n(vbW / 2)}" ry="${n(vbH - auraCy)}" fill="url(#${auraId})"/>`;

  // موضع الفم بعد تصغير الرأس ثم إمالته، وهو مصدر الشَّرر
  const scaled = [
    pivot[0] + (k.mouthAt[0] - pivot[0]) * HEAD_SCALE,
    pivot[1] + (k.mouthAt[1] - pivot[1]) * HEAD_SCALE,
  ];
  const mouthAt = rotatePoint(scaled, k.tilt, pivot);
  const mouth = [mouthAt[0] + shiftX, mouthAt[1] + dropY];

  const emotion = k.emotion({ spark, vbW, vbH, dropY, mouth });

  return `<svg ${NS} class="figure-svg" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMax meet">
  ${aura}
  ${emotion}
  <g transform="translate(0 ${n(dropY)})">${bust}</g>
</svg>`;
}

export default figure;
