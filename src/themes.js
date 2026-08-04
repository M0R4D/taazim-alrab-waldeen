// الاتجاهات البصرية الثلاثة للبوستر.
// قيم CMYK التقريبية للطباعة (Coated FOGRA39) مذكورة في README لمطابقة المطبعة.

export const themes = {
  // مهيب: كحلي ليلي + ذهبي. أعلى تباين، الأنسب للوحات الطرق السريعة.
  mahib: {
    id: 'mahib',
    name: 'مهيب',
    bg: 'radial-gradient(120% 90% at 78% 8%, #16223f 0%, #0a1024 42%, #05070f 100%)',
    ink: '#ffffff',
    inkSoft: '#c3cde3',
    accent: '#e8bd66',
    accentDeep: '#a97c29',
    accentSoft: '#f6dfa8',
    hair: 'rgba(232,189,102,0.42)',
    panelBg: 'rgba(255,255,255,0.045)',
    panelBorder: 'rgba(232,189,102,0.34)',
    headlineTop: '#ffffff',
    headlineKey: '#f2c463',
    headlineShadow: 'rgba(0,0,0,0.55)',
    pattern: { color: '#e8bd66', opacity: 0.075 },
    glow: 'rgba(232,189,102,0.13)',
    // الطيف البشري: حَشْوٌ شديد القتامة، وحدٌّ مضيء، ولون للشَّرر أو النور.
    // spark هو الأصل، وkindSpark يخصّ كل انفعالٍ بلونه: نورٌ نازل، ونداءٌ صاعد، وكلامٌ يُكتَب، وبيتٌ يُظلَّل
    figure: {
      fill: '#04060d',
      rim: '#e8bd66',
      spark: '#f0a94e',
      kindSpark: { awe: '#f6dfa8', stand: '#f2c463', hush: '#e8bd66', kin: '#f0cd7f' },
    },
    split: null,
  },

  // دعوي: أخضر عميق + كريمي وذهبي. نبرة تعظيم ومحبة.
  daawi: {
    id: 'daawi',
    name: 'دعوي',
    bg: 'radial-gradient(120% 95% at 22% 6%, #106a45 0%, #0a4a30 44%, #04241a 100%)',
    ink: '#fdf8ec',
    inkSoft: '#c9dfd2',
    accent: '#e6be6a',
    accentDeep: '#b08a34',
    accentSoft: '#f7e8c3',
    hair: 'rgba(230,190,106,0.45)',
    panelBg: 'rgba(253,248,236,0.06)',
    panelBorder: 'rgba(230,190,106,0.36)',
    headlineTop: '#fdf8ec',
    headlineKey: '#f0cd7f',
    headlineShadow: 'rgba(0,0,0,0.45)',
    pattern: { color: '#f7e8c3', opacity: 0.07 },
    glow: 'rgba(230,190,106,0.12)',
    figure: {
      fill: '#031a12',
      rim: '#e6be6a',
      spark: '#f2d68f',
      kindSpark: { awe: '#f7e8c3', stand: '#e6be6a', hush: '#dcc891', kin: '#cfe3d2' },
    },
    split: null,
  },

  // تقابل: نصف داكن للتحذير ونصف منير لباب التوبة.
  taqabul: {
    id: 'taqabul',
    name: 'تقابل',
    bg: 'radial-gradient(120% 90% at 70% 4%, #1b1526 0%, #0d0a14 46%, #06050a 100%)',
    ink: '#ffffff',
    inkSoft: '#cbc3d6',
    accent: '#e8903f',
    accentDeep: '#a5501a',
    accentSoft: '#f7c58c',
    hair: 'rgba(232,144,63,0.45)',
    panelBg: 'rgba(255,255,255,0.05)',
    panelBorder: 'rgba(232,144,63,0.34)',
    headlineTop: '#ffffff',
    headlineKey: '#f0a55b',
    headlineShadow: 'rgba(0,0,0,0.6)',
    pattern: { color: '#e8903f', opacity: 0.08 },
    glow: 'rgba(232,144,63,0.14)',
    figure: {
      fill: '#05040a',
      rim: '#e8903f',
      spark: '#f07f2e',
      kindSpark: { awe: '#f7c58c', stand: '#f0a55b', hush: '#e8903f', kin: '#f2b477' },
    },
    // منطقة النور السفلية تبدأ عند صف الخطوات العملية وتمتد حتى حافة القص
    split: {
      startAt: 'steps',
      bg: 'linear-gradient(180deg, #f7f1e3 0%, #eee4cd 100%)',
      ink: '#0d3b2a',
      inkSoft: '#405c50',
      accent: '#0f6b45',
      accentDeep: '#0b4a30',
      hair: 'rgba(15,107,69,0.4)',
      panelBorder: 'rgba(15,107,69,0.32)',
      pattern: { color: '#0f6b45', opacity: 0.07 },
    },
  },
};

export const themeIds = Object.keys(themes);

/**
 * ألوان الطيف في اتجاهٍ بصريٍّ معيّن لنوعٍ معيّن.
 * الشَّرر وحده يتغيّر بالنوع؛ أما الحَشْو والحدّ فيثبتان كي لا ينفصل الطيف عن الخلفية.
 */
export function figureColors(theme, kind) {
  const { kindSpark, ...base } = theme.figure;
  return { ...base, spark: (kindSpark && kindSpark[kind]) || base.spark };
}

export default themes;
