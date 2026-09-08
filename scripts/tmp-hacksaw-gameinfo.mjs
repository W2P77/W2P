import { chromium } from 'playwright';
import fs from 'node:fs';
const CH = '/Users/joris/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const OUT = '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/hacksaw';
const id = process.argv[2], ver = process.argv[3], tag = process.argv[4];
const url = `https://static-live.hacksawgaming.com/${id}/${ver}/index.html?language=en&channel=desktop&gameid=${id}&mode=2&token=demo&lobbyurl=https%3A%2F%2Fwww.hacksawgaming.com&currency=EUR&partner=demo&env=https://rgs-demo.hacksawgaming.com/api&realmoneyenv=https://rgs-demo.hacksawgaming.com/api`;
const b = await chromium.launch({ headless: false, executablePath: CH, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
const urls = [];
page.on('request', r => { if (/meta\/gameInfo/i.test(r.url())) urls.push(r.url()); });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(22000);
console.log('meta urls:', urls);
for (const u of [...new Set(urls)]) {
  const j = await page.evaluate(async (uu) => { const r = await fetch(uu); return await r.text(); }, u);
  fs.writeFileSync(`${OUT}/${tag}-gameInfo.json`, j);
  console.log('saved', j.length, 'bytes for', u);
}
await page.screenshot({ path: `${OUT}/${tag}-jeu.png` });
await b.close();
