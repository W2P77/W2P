import { chromium } from 'playwright';
import fs from 'node:fs';
const CH = '/Users/joris/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const OUT = '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/hacksaw';
const id = process.argv[2], ver = process.argv[3], tag = process.argv[4];
const url = `https://static-live.hacksawgaming.com/${id}/${ver}/index.html?language=en&channel=desktop&gameid=${id}&mode=2&token=demo&lobbyurl=https%3A%2F%2Fwww.hacksawgaming.com&currency=EUR&partner=demo&env=https://rgs-demo.hacksawgaming.com/api&realmoneyenv=https://rgs-demo.hacksawgaming.com/api`;
const b = await chromium.launch({ headless: false, executablePath: CH, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(23000);
await page.screenshot({ path: `${OUT}/${tag}-1-splash.png` });
await page.mouse.click(640, 725); await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/${tag}-2-jeu.png` });
await page.mouse.click(258, 735); await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/${tag}-3-menu.png` });
await page.mouse.click(336, 591); await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/${tag}-4-info.png` });

// état du panneau GameInfo
const info = await page.evaluate(() => {
  const p = document.querySelector('.GameInfo, #GameInfo, [class*=GameInfo]');
  const sc = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 40 && e.clientHeight > 200)
    .map(e => ({ cls: (typeof e.className==='string'?e.className:'').slice(0,60), id: e.id, ch: e.clientHeight, sh: e.scrollHeight }));
  return { scrollables: sc, text: document.body.innerText.length };
});
console.log('SCROLLABLES:', JSON.stringify(info.scrollables, null, 1));
fs.writeFileSync(`${OUT}/${tag}-gameinfo-text.txt`, await page.evaluate(()=>document.body.innerText));
fs.writeFileSync(`${OUT}/${tag}-gameinfo-dom.html`, await page.content());
await b.close();
