// نقوش هندسية إسلامية متجهية (SVG مضمّن) — بلا صور ذوات أرواح وبلا ملفات خارجية.
// كل الأشكال محسوبة رياضياً فتبقى حادّة عند أي تكبير.

const NS = 'xmlns="http://www.w3.org/2000/svg"';

const round = (n) => Number(n.toFixed(3));

/** نجمة ذات n رأساً: نسبة نصف القطر الداخلي 0.4142 هي نسبة النجمة الثمانية الكلاسيكية {8/3} */
function starPath(cx, cy, outer, points = 8, innerRatio = 0.4142, rotation = -Math.PI / 8) {
  const inner = outer * innerRatio;
  const d = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    d.push(`${i === 0 ? 'M' : 'L'}${round(cx + r * Math.cos(a))} ${round(cy + r * Math.sin(a))}`);
  }
  return d.join(' ') + ' Z';
}

/** بلاطة النقش: خاتم ثماني في المركز، وأرباع خواتم في الأركان، وشبكة مربعات مائلة */
function girihTileContent(strokeWidth) {
  const sw = strokeWidth;
  const parts = [
    `<path d="${starPath(50, 50, 30)}" fill="none" stroke="currentColor" stroke-width="${sw}"/>`,
    `<path d="${starPath(50, 50, 13)}" fill="none" stroke="currentColor" stroke-width="${sw * 0.8}"/>`,
    `<path d="M50 4 L96 50 L50 96 L4 50 Z" fill="none" stroke="currentColor" stroke-width="${sw * 0.7}"/>`,
  ];
  for (const [cx, cy] of [
    [0, 0],
    [100, 0],
    [0, 100],
    [100, 100],
  ]) {
    parts.push(`<path d="${starPath(cx, cy, 22)}" fill="none" stroke="currentColor" stroke-width="${sw}"/>`);
  }
  return parts.join('');
}

/** طبقة خلفية كاملة مملوءة بالنقش المتكرر */
export function patternLayer(id, { color = '#ffffff', opacity = 0.07, tile = 44, strokeWidth = 1.6 } = {}) {
  return `<svg ${NS} class="orn-layer" preserveAspectRatio="none" style="color:${color};opacity:${opacity}">
  <defs>
    <pattern id="${id}" viewBox="0 0 100 100" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">
      ${girihTileContent(strokeWidth)}
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#${id})"/>
</svg>`;
}

/** ميدالية الخاتم الثماني: تستعمل شارةً وفاصلاً */
export function khatam({ color = 'currentColor', strokeWidth = 4, filled = false } = {}) {
  return `<svg ${NS} viewBox="0 0 100 100" class="orn-khatam" style="color:${color}">
  <path d="${starPath(50, 50, 46)}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linejoin="miter"/>
  <path d="${starPath(50, 50, 25)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth * 0.85}" stroke-linejoin="miter"/>
  <circle cx="50" cy="50" r="8" fill="currentColor"/>
</svg>`;
}

/** زخرفة ركنية هندسية: زاويتان متداخلتان وخاتم صغير عند المرفق */
export function cornerFlourish({ color = 'currentColor', strokeWidth = 1.8 } = {}) {
  return `<svg ${NS} viewBox="0 0 120 120" class="orn-corner" style="color:${color}">
  <path d="M2 118 L2 34 Q2 2 34 2 L118 2" fill="none" stroke="currentColor" stroke-width="${strokeWidth}"/>
  <path d="M12 118 L12 38 Q12 12 38 12 L118 12" fill="none" stroke="currentColor" stroke-width="${strokeWidth * 0.6}"/>
  <path d="${starPath(30, 30, 12)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth * 0.8}"/>
  <path d="M2 70 L12 70 M70 2 L70 12" stroke="currentColor" stroke-width="${strokeWidth * 0.6}"/>
</svg>`;
}

export default { patternLayer, khatam, cornerFlourish };
