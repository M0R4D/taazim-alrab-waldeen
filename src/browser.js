// العثور على متصفح مبنيّ على كروميوم مثبّت مسبقاً، بلا تنزيل أي شيء.

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CANDIDATES = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

export const LAUNCH_ARGS = [
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
  '--disable-lcd-text',
  '--allow-file-access-from-files',
];

export function findBrowser() {
  const found = CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('لم يُعثر على متصفح Edge أو Chrome. حدّد المسار في متغيّر البيئة EDGE_PATH.');
  return found;
}

/**
 * كل صفحة ترسم لوحةً بحجم 6198×4686 وتكتب نحو 15 ميجابايت، فيبطؤ المتصفح تحت الحمل
 * حتى تنقضي مهلة بروتوكول puppeteer الافتراضية (١٨٠ ثانية) فيسقط البناء بـ
 * «Network.enable timed out» وهو حيٌّ لم يمت. فنُوسِّع المهلة بدل أن نُعلن موته.
 */
export function launchBrowser(options = {}) {
  return puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: LAUNCH_ARGS,
    protocolTimeout: Number(process.env.PROTOCOL_TIMEOUT || 600000),
    ...options,
  });
}

/** كروميوم لا يُنهي نفسه أحياناً على ويندوز، فنقتله بعد مهلة قصيرة بدل تعليق العملية */
export async function closeBrowser(browser) {
  await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 8000))]);
  browser.process()?.kill('SIGKILL');
}
