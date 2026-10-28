// Link previews: the picture a link to the site shows on LinkedIn, WhatsApp,
// X, Slack and iMessage. One per page, 1200 x 630, in the site's own type
// and pieces, written to public/og/<page>.jpg.
//
//   node scripts/og/render.js            (needs Playwright, and the network for Google Fonts)
//
// JPEG under ~300 KB: WhatsApp drops larger previews.
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../..");
// Inlined: a page made with setContent may not read file:// URLs.
const MIME = { ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg" };
const asset = (p) =>
  `data:${MIME[path.extname(p)]};base64,${fs.readFileSync(path.join(ROOT, "public", p)).toString("base64")}`;
const OUT = path.join(ROOT, "public/og");

const STAR = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7"/></svg>`;

const base = (dark) => `
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body { position: relative; overflow: hidden; background: ${dark ? "#000" : "#fff"}; color: ${dark ? "#fff" : "#000"}; font-family: Outfit, sans-serif; }
  .logo { position: absolute; left: 64px; top: 56px; height: 34px; ${dark ? "" : "filter: invert(1);"} }
  .url { position: absolute; left: 64px; bottom: 50px; font: 400 22px "Anonymous Pro", monospace; opacity: .62; letter-spacing: .01em; }
  .head { position: absolute; left: 64px; display: flex; align-items: center; gap: 26px; }
  .title { font: 400 76px/1 "Anonymous Pro", monospace; white-space: nowrap; letter-spacing: -.01em; }
  .title b { font-weight: 400; opacity: .9; }
  .star { font-size: 40px; display: flex; }
  .sub { line-height: 1.25; }
  .sub strong { display: block; font-size: 27px; font-weight: 700; }
  .sub span { display: block; font-size: 22px; opacity: .7; margin-top: 2px; }
  .lede { position: absolute; left: 64px; font-size: 34px; line-height: 1.3; font-weight: 400; max-width: 600px; }
  .print { position: absolute; background: #fff; padding: 12px 12px 40px; box-shadow: 0 30px 60px -26px rgba(0,0,0,.5), 0 0 0 1px rgba(0,0,0,.06); }
  .tape { position: absolute; top: -16px; left: 50%; width: 110px; height: 32px; margin-left: -55px; background: rgba(255,240,160,.85); transform: rotate(4deg); }
`;

const head = (title, strong, small, top) => `
  <div class="head" style="top:${top}px">
    <div class="title"><b>[</b>${title}<b>]</b></div>
    <div class="star">${STAR}</div>
    <div class="sub"><strong>${strong}</strong><span>${small}</span></div>
  </div>`;

const CARDS = {
  // Home: the portrait as it sits in the hero, and the line from it.
  home: {
    dark: true,
    css: `.portrait { position: absolute; right: 70px; top: 58px; width: 420px; }
          .portrait img { position: absolute; }
          .shadow { left: -28.186%; top: -15.552%; width: 156.371%; opacity: .86; }
          .photo { position: relative !important; width: 100%; }
          .hi { position: absolute; left: 50%; top: 88%; transform: translateX(-50%); font: 400 40px "Anonymous Pro", monospace; white-space: nowrap; text-shadow: 0 2px 3px rgba(0,0,0,.55); }`,
    html: `
      <img class="logo" src="${asset("logo.png")}">
      <div class="head" style="top:190px"><div class="title"><b>[</b>Goutham G<b>]</b></div></div>
      <div class="lede" style="top:300px">I build digital products<br>with AI, code &amp; design.</div>
      <div class="lede" style="top:420px; font-size:23px; font-weight:600; opacity:.9">AI Full Stack Developer &amp; Product Designer</div>
      <div class="portrait">
        <img class="shadow" src="${asset("portrait/shadow.png")}">
        <img class="photo" src="${asset("portrait/photo.webp")}">
        <div class="hi">[ Vanakamm! ]</div>
      </div>
      <div class="url">1goutham.space</div>`,
  },
  // Beyond: the taped photo, as on the page.
  beyond: {
    dark: false,
    css: `.print { right: 120px; top: 70px; width: 330px; transform: rotate(-4deg); }
          .print img { display: block; width: 100%; }`,
    html: `
      <img class="logo" src="${asset("logo.png")}">
      ${head("Beyond", "A bit more about me :)", "not the resumeeee version", 214)}
      <div class="lede" style="top:330px; font-size:28px; max-width:560px; opacity:.85">How design led to code, and code led to AI. Plus retro games and things 2px out of place.</div>
      <div class="print" style="padding:0; background:none; box-shadow:none"><img src="${asset("beyondpic.png")}"></div>
      <div class="url">1goutham.space/beyond</div>`,
  },
  // Margin: the starburst and a few stickers, and a scribble in the margin.
  margin: {
    dark: false,
    css: `.st { position: absolute; }
          .scribble { position: absolute; left: 0; top: 0; }`,
    html: `
      <img class="logo" src="${asset("logo.png")}">
      ${head("Margin", "Draw something weird", "and pin it to the wall", 214)}
      <div class="lede" style="top:330px; font: 900 48px/1.05 'Playfair Display', serif;">&lsquo;til death,<br>we do art.</div>
      <img class="st" src="${asset("1gartlabcenterlogo.png")}" style="right:70px; top:70px; width:400px; transform: rotate(-4deg)">
      <img class="st" src="${asset("cow.png")}" style="right:330px; top:300px; width:200px; transform: rotate(-8deg)">
      <img class="st" src="${asset("kidwithspoon.png")}" style="right:92px; top:270px; width:230px; transform: rotate(6deg)">
      <img class="st" src="${asset("eyes.png")}" style="right:250px; top:478px; width:250px; transform: rotate(-3deg)">
      <svg class="scribble" width="1200" height="630" viewBox="0 0 1200 630"><path d="M520 548c40-30 70 18 108-8s52-46 90-22 58 26 92-4" fill="none" stroke="#e0322f" stroke-width="5" stroke-linecap="round"/></svg>
      <div class="url">1goutham.space/margin</div>`,
  },
  // 1G-works: the handwritten wordmark, as on its own page.
  works: {
    dark: true,
    css: `.mark { position: absolute; left: 0; right: 0; top: 200px; text-align: center; font: 400 128px/1 "Nothing You Could Do", cursive; letter-spacing: .02em; }
          .rule { position: absolute; left: 430px; top: 352px; width: 340px; height: 3px; background: #fff; border-radius: 3px; transform: rotate(-1.5deg); }
          .tag { position: absolute; left: 0; right: 0; top: 400px; text-align: center; font-size: 30px; }
          .tag span { display: block; font-size: 22px; opacity: .65; margin-top: 8px; }`,
    html: `
      <img class="logo" src="${asset("logo.png")}">
      <div class="mark">1G-works</div>
      <div class="rule"></div>
      <div class="tag">Ideas into digital impact :)<span>Design, web, growth and AI for your business</span></div>
      <div class="url">1goutham.space/works</div>`,
  },
  // Projects: the products, as app icons.
  projects: {
    dark: true,
    css: `.phone { position: absolute; top: 300px; width: 180px; height: 342px; border-radius: 30px; overflow: hidden; border: 6px solid #1c1c1c; box-shadow: 0 30px 60px -20px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.12); }
          .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; }`,
    html: `
      <img class="logo" src="${asset("logo.png")}">
      ${head("Projects", "Products by 1Goutham", "Ideas, interfaces &amp; intelligence", 214)}
      <div class="lede" style="top:330px; font-size:26px; max-width:520px; opacity:.85">Ideako, ZtudyLock, FabricNest and IdeaGuard: AI products, designed and built end to end.</div>
      <div class="phone" style="right:318px; transform: translateY(40px) rotate(-10deg)"><img src="${asset("FNss.jpg")}"></div>
      <div class="phone" style="right:192px; transform: translateY(0) rotate(-3deg)"><img src="${asset("ZLss.jpg")}"></div>
      <div class="phone" style="right:62px; transform: translateY(26px) rotate(6deg)"><img src="${asset("Ideakoss.jpg")}"></div>
      <div class="url">1goutham.space/projects</div>`,
  },
  // Arcade: the console.
  arcade: {
    dark: true,
    css: `.console { position: absolute; right: 56px; top: 78px; width: 400px; transform: rotate(-6deg); }`,
    html: `
      <img class="logo" src="${asset("logo.png")}">
      ${head("Arcade", "My fav retro games", "Just thought of having it here :)", 214)}
      <div class="lede" style="top:330px; font: 400 30px/1.6 'Anonymous Pro', monospace; opacity:.85">[ Run ] [ Flap ] [ Snake ]<br>[ Pong ] [ Catch ]</div>
      <img class="console" src="${asset("ArcadePic.png")}">
      <div class="url">1goutham.space/arcade</div>`,
  },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const fonts = "https://fonts.googleapis.com/css2?family=Anonymous+Pro&family=Outfit:wght@400;600;700&family=Playfair+Display:wght@900&family=Nothing+You+Could+Do&display=block";
  const only = process.argv.slice(2);
  for (const [name, card] of Object.entries(CARDS)) {
    if (only.length && !only.includes(name)) continue;
    await page.setContent(
      `<!doctype html><html><head><link rel="stylesheet" href="${fonts}"><style>${base(card.dark)}${card.css}</style></head><body>${card.html}</body></html>`,
      { waitUntil: "networkidle" }
    );
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `${name}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 88 });
    console.log(name, Math.round(fs.statSync(file).size / 1024) + " KB");
  }
  await browser.close();
})();
