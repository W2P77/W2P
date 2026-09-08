import { chromium } from 'playwright';
const CH = '/Users/joris/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const OUT = '/private/tmp/claude-501/-Users-joris-Documents-GitHub-BetsRank/6091ffbe-aa2e-4af1-ac40-cd360a2e860a/scratchpad/hacksaw';
const slug = process.argv[2] || 'wanted-dead-or-a-wild';

const b = await chromium.launch({ executablePath: CH, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addCookies([
  { name: 'CookiesConsent', value: 'granted', domain: 'www.hacksawgaming.com', path: '/' },
  { name: 'age_verified', value: 'true', domain: 'www.hacksawgaming.com', path: '/' },
]);
const page = await ctx.newPage();
const net = [];
page.on('response', r => { const u = r.url(); if (!/\.(png|jpg|jpeg|webp|woff2?|mp3|ogg|atlas|ttf|svg)/.test(u)) net.push(r.status()+' '+u); });

await page.goto(`https://www.hacksawgaming.com/games/${slug}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.locator('.js-launch-game').first().click();
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/${slug}-03-apres-tryit.png` });
const src = await page.evaluate(() => document.getElementById('Game')?.getAttribute('src') || null);
console.log('\n=== IFRAME SRC ===\n' + src + '\n');
await page.waitForTimeout(15000);
await page.screenshot({ path: `${OUT}/${slug}-04-charge.png` });
console.log('=== NET ===');
console.log([...new Set(net)].filter(u=>/json|api|rtp|payout|config|version|hacksaw/i.test(u)).slice(0,50).join('\n'));
await b.close();
