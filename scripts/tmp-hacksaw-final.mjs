import { chromium } from 'playwright';
import fs from 'node:fs';
const CH = '/Users/joris/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const OUT = '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/hacksaw';
const [id, ver, tag] = process.argv.slice(2);
const url = `https://static-live.hacksawgaming.com/${id}/${ver}/index.html?language=en&channel=desktop&gameid=${id}&mode=2&token=demo&lobbyurl=https%3A%2F%2Fwww.hacksawgaming.com&currency=EUR&partner=demo&env=https://rgs-demo.hacksawgaming.com/api&realmoneyenv=https://rgs-demo.hacksawgaming.com/api`;
const b = await chromium.launch({ headless: false, executablePath: CH, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
let meta = null;
page.on('request', r => { if (/meta\/gameInfo/.test(r.url())) meta = r.url(); });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(23000);
await page.screenshot({ path: `${OUT}/${tag}-1-splash.png` });
const t0 = await page.evaluate(()=>document.body.innerText);
const rtp0 = /theoretical payout \(RTP\) for this game is ([\d.]+)%/.exec(t0);
console.log(`[${tag}] AVANT tout clic : innerText ${t0.length} car., RTP=${rtp0?rtp0[1]:'ABSENT'}`);

await page.mouse.click(640, 725); await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/${tag}-2-jeu.png` });
const t1 = await page.evaluate(()=>document.body.innerText);
console.log(`[${tag}] apres splash : ${t1.replace(/\n/g,' | ').slice(0,150)}`);

await page.mouse.click(258, 735); await page.waitForTimeout(2500);
const menu = await page.evaluate(()=> { const e=document.getElementById('GameInfoBtn'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)}; });
console.log(`[${tag}] GameInfoBtn @`, JSON.stringify(menu));
await page.screenshot({ path: `${OUT}/${tag}-3-menu.png` });
if (menu) { await page.mouse.click(menu.x, menu.y); await page.waitForTimeout(3000); }
await page.screenshot({ path: `${OUT}/${tag}-4-info.png` });
const sc = await page.evaluate(()=> { const e=document.getElementById('GameInfoBody'); return e?{ch:e.clientHeight, sh:e.scrollHeight}:null; });
console.log(`[${tag}] GameInfoBody`, JSON.stringify(sc), sc? `=> ${Math.ceil(sc.sh/sc.ch)} ecrans de defilement` : '');
const t2 = await page.evaluate(()=>document.body.innerText);
fs.writeFileSync(`${OUT}/${tag}-texte.txt`, t2);
const rtp = /theoretical payout \(RTP\) for this game is ([\d.]+)%/.exec(t2);
console.log(`[${tag}] RTP dans le texte DOM : ${rtp?rtp[1]+'%':'ABSENT'}`);
if (meta) {
  const j = JSON.parse(await page.evaluate(async u => (await fetch(u)).text(), meta));
  fs.writeFileSync(`${OUT}/${tag}-gameInfo.json`, JSON.stringify(j, null, 1));
  console.log(`[${tag}] meta/gameInfo : rtp=${j.data.rtp} maxWin=${j.data.maximumWinMultiplier} hitFreq=${j.data.hitFrequency} oddsMax=${j.data.oddsOfMaxWin} nbSymboles=${j.data.symbols.length}`);
  console.log(`[${tag}] URL meta : ${meta}`);
}
// canvas vs DOM
console.log(`[${tag}] canvas=${await page.evaluate(()=>document.querySelectorAll('canvas').length)}`);
await b.close();
