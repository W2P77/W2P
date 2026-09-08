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
await page.waitForTimeout(22000);
await page.screenshot({ path: `${OUT}/${tag}-A-splash.png` });

const dump = async (label) => {
  const els = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.width > 1270) return;
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      const cls = (typeof e.className === 'string' ? e.className : '') ;
      if (!/button|btn|icon|menu|info|nav|arrow|close|tab|clickable|hs-/i.test(cls + ' ' + e.id)) return;
      out.push({ tag: e.tagName, id: e.id, cls: cls.slice(0,80), x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height), txt: (e.innerText||'').slice(0,30).replace(/\n/g,'|') });
    });
    return out;
  });
  console.log(`\n### ${label} (${els.length} el)`);
  for (const e of els) console.log(`  ${e.tag}#${e.id}.${e.cls} @(${e.x},${e.y}) ${e.w}x${e.h} "${e.txt}"`);
  console.log('  innerText:', (await page.evaluate(()=>document.body.innerText)).replace(/\n/g,' | ').slice(0,400));
};
await dump('SPLASH');

// dismiss splash
await page.mouse.click(640, 725);
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/${tag}-B-jeu.png` });
await dump('JEU');
fs.writeFileSync(`${OUT}/${tag}-dom.html`, await page.content());
await b.close();
