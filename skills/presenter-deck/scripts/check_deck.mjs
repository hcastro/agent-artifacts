#!/usr/bin/env node
// Check a deck built with build_deck.py --standalone.
//
//   node check_deck.mjs deck-local.html [--shots DIR] [--scale 1]
//
// Opens the page in Chromium and reports, per slide: console errors, and any element that runs
// past the slide's canvas. Then checks the presenting mechanics end to end: present mode, presenter
// view, and that an audience tab follows presenter view (go, black screen) and shares the timer.
// --shots writes one PNG per slide at the canvas size, for review or a share copy.
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { shots: { type: "string" }, scale: { type: "string", default: "1" } },
});
const file = positionals[0];
if (!file) { console.error("usage: node check_deck.mjs deck-local.html [--shots DIR] [--scale 1]"); process.exit(2); }
const shots = values.shots || null;
const scale = Number(values.scale) || 1;

let pw;
try { pw = await import("playwright"); } catch {
  const root = execSync("npm root -g").toString().trim();
  pw = await import(pathToFileURL(join(root, "playwright", "index.mjs")).href);
}
const { chromium } = pw;
const url = pathToFileURL(resolve(file)).href;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: scale });
const problems = [];
const errors = [];
const watch = (p, label) => {
  p.on("console", (m) => { if (m.type() === "error") errors.push(`${label}: ${m.text()}`); });
  p.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
};

// 1. every slide: overflow past the canvas
const page = await ctx.newPage();
watch(page, "page");
await page.goto(url);
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const d = document.getElementById("deck");
  return { w: Number(d.dataset.canvasW) || 1280, h: Number(d.dataset.canvasH) || 720,
           ids: Array.from(document.querySelectorAll("#deck-canvas > .slide")).map((s) => s.id) };
});
if (shots) mkdirSync(shots, { recursive: true });
const shotPage = shots ? await ctx.newPage() : null;
if (shotPage) {
  await shotPage.setViewportSize({ width: info.w, height: info.h });
  await shotPage.goto(url);
}
for (const [k, id] of info.ids.entries()) {
  const over = await page.evaluate(({ id, w, h }) => {
    const s = document.getElementById(id);
    document.querySelectorAll("#deck-canvas > .slide").forEach((x) => { x.hidden = x !== s; });
    const cv = document.getElementById("deck-canvas");
    const prev = cv.style.transform;
    cv.style.transform = "none";
    const box = s.getBoundingClientRect();
    const bad = [];
    if (s.scrollWidth > w + 1 || s.scrollHeight > h + 1) bad.push(`the slide scrolls to ${s.scrollWidth}x${s.scrollHeight}`);
    s.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const out = r.right > box.left + w + 1 || r.bottom > box.top + h + 1 || r.left < box.left - 1 || r.top < box.top - 1;
      const cs = getComputedStyle(el);
      const hides = (v) => v === "hidden" || v === "clip";
      const clipped = (hides(cs.overflowX) && el.scrollWidth > el.clientWidth + 2) || (hides(cs.overflowY) && el.scrollHeight > el.clientHeight + 2);
      if (out || clipped) bad.push(`<${el.tagName.toLowerCase()}> "${(el.textContent || "").trim().slice(0, 40)}" ${Math.round(r.right - box.left)}x${Math.round(r.bottom - box.top)}`);
    });
    cv.style.transform = prev;
    return bad.slice(0, 5);
  }, { id, w: info.w, h: info.h });
  if (over.length) problems.push(`slide ${k + 1} (${id}) runs past the canvas: ${over.join("; ")}`);
  if (shotPage) {
    await shotPage.evaluate((id) => {
      document.querySelectorAll("#deck-canvas > .slide").forEach((x) => { x.hidden = x.id !== id; });
      const cv = document.getElementById("deck-canvas");
      const st = getComputedStyle(document.getElementById("deck-stage"));
      // Only the slide goes in the shot: hide the page around it and give the canvas the stage's colors.
      document.body.style.visibility = "hidden";
      cv.style.visibility = "visible";
      cv.style.background = st.backgroundColor;
      cv.style.color = getComputedStyle(cv).color;
      cv.style.transform = "none"; cv.style.position = "fixed"; cv.style.left = "0"; cv.style.top = "0"; cv.style.zIndex = "99999";
    }, id);
    await shotPage.waitForTimeout(150);
    await shotPage.screenshot({ path: join(shots, `${String(k + 1).padStart(2, "0")}-${id.replace(/^slide-/, "")}.png`), clip: { x: 0, y: 0, width: info.w, height: info.h } });
  }
}

// 2. mechanics: presenter view drives an audience tab
const pres = await ctx.newPage();
watch(pres, "presenter");
await pres.goto(url + "#presenter");
const aud = await ctx.newPage();
watch(aud, "audience");
await aud.goto(url + "#present");
await pres.waitForTimeout(1200);
const cur = (p) => p.evaluate(() => { const s = Array.from(document.querySelectorAll("#deck-canvas > .slide")).findIndex((x) => !x.hidden); return s; });
const check = (ok, msg) => { if (!ok) problems.push(msg); };
check(await pres.evaluate(() => !document.getElementById("presenter").hidden), "presenter view did not open from #presenter");
check(await aud.evaluate(() => document.getElementById("deck").classList.contains("is-presenting")), "present mode did not open from #present");
check(await aud.evaluate(() => document.documentElement.classList.contains("deck-time-off")), "the audience window should start with the time hidden");
await pres.bringToFront();
const target = Math.min(2, info.ids.length - 1);
for (let k = 0; k < target; k++) await pres.keyboard.press("ArrowRight");
await aud.waitForTimeout(600);
if (target > 0) check((await cur(aud)) === target, `audience tab did not follow presenter view (on slide ${(await cur(aud)) + 1}, expected ${target + 1})`);
const audState = await pres.evaluate(() => document.querySelector(".pv-aud-btn").dataset.state);
check(audState === "on", `presenter header shows audience state "${audState}", expected "on"`);
await pres.keyboard.press("b");
await aud.waitForTimeout(400);
check(await aud.evaluate(() => !document.getElementById("deck-black").hidden), "black screen did not reach the audience tab");
await pres.keyboard.press("b");
await pres.click('[data-pv="timer"]');
await pres.waitForTimeout(1500);
const t = await aud.evaluate(() => document.getElementById("hud-timer").textContent);
check(t !== "00:00", `timer started in presenter view did not reach the audience tab (shows ${t})`);
await pres.keyboard.press("Escape");
await pres.waitForTimeout(300);
check(await pres.evaluate(() => document.getElementById("presenter").hidden), "Esc did not leave presenter view");

await browser.close();
console.log(`${info.ids.length} slides · canvas ${info.w}x${info.h}${shots ? ` · shots in ${shots}` : ""}`);
for (const e of errors) console.log(`console error: ${e}`);
for (const p of problems) console.log(`problem: ${p}`);
if (!errors.length && !problems.length) console.log("ok: no overflow, no console errors, presenting mechanics pass");
process.exit(errors.length || problems.length ? 1 : 0);
