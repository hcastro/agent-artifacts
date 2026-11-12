#!/usr/bin/env node
// Plays the course the way a learner would and reports every error it sees.
//
//   node learner_test.mjs --url http://127.0.0.1:8765/preview.html --playwright <dir> [--shots <dir>] [--questions 40]
//
// --playwright is any folder whose node_modules holds `playwright`, so the kit needs no install of its own.
// The run takes the placement, answers questions in every format through the real controls (some wrong
// on purpose), takes a final when one opens, visits every view, reloads to check that progress persisted,
// and restores from the save block. It prints "no errors" or the list, and exits 1 on errors.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1]; i++; }
}
if (!args.url || !args.playwright) {
  console.error('usage: node learner_test.mjs --url <page url> --playwright <dir with node_modules/playwright> [--shots <dir>] [--questions 40]');
  process.exit(2);
}
const SHOTS = path.resolve(args.shots || 'learner-shots');
const TARGET = parseInt(args.questions || '40', 10);
fs.mkdirSync(SHOTS, { recursive: true });

const require = createRequire(path.join(path.resolve(args.playwright), 'package.json'));
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('@playwright/test')); }

const errors = [], notes = [];
const fail = msg => errors.push(msg);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' });
const page = await ctx.newPage();
const origin = new URL(args.url).origin;
page.on('console', m => {
  if (m.type() !== 'error') return;
  const src = (m.location() && m.location().url) || '';
  // a font or other third-party file that fails offline is worth a note, not a failure
  if (src && !src.startsWith(origin)) notes.push('third-party: ' + m.text().slice(0, 140));
  else fail('console: ' + m.text().slice(0, 200));
});
page.on('pageerror', e => fail('page error: ' + String(e).slice(0, 300)));
const shot = name => page.screenshot({ path: path.join(SHOTS, name + '.png') });
const wait = ms => page.waitForTimeout(ms);
const cur = () => page.evaluate(() => {
  const c = Course.Learn.cur;
  return c ? { id: c.q.id, format: c.q.format, mode: c.mode, type: c.q.type, rel: c.q.rel || null, owner: !!c.q.owner, evidence: (c.q.evidence || []).length, challenge: !!c.q.challenge, resolved: !!c.resolved } : null;
});
const clickConf = conf => page.click(`.submit [data-conf="${conf}"]`);
async function closeOverlay() {
  const lu = page.locator('.levelup');
  if (await lu.count()) { await lu.click().catch(() => {}); await wait(120); return true; }
  return false;
}

// Answers the current question through the controls. `right` false gives a wrong answer where the format allows it.
async function answer(info, right, conf) {
  if (info.format === 'choice' || info.format === 'multi') {
    const opts = await page.evaluate(() => Course.Learn.cur.q.options.map(o => ({ id: o.id, c: !!o.correct })));
    let want = opts.map(o => o.c);
    if (!right) want = info.format === 'choice' ? opts.map((o, i) => i === opts.findIndex(x => !x.c)) : opts.map(o => !o.c);
    for (let i = 0; i < opts.length; i++) {
      const sel = `.qcard .opts .opt[data-id="${opts[i].id}"]`;
      const on = (await page.getAttribute(sel, 'aria-checked')) === 'true';
      if (on !== want[i]) await page.click(sel);
    }
    await clickConf(conf);
  } else if (info.format === 'order') {
    const items = await page.evaluate(() => Course.Learn.cur.q.items.map(t => t.replace(/`|\*\*/g, '')));
    // bubble the shown order into the correct one using the move buttons
    for (let moves = 0; right && moves < 60; moves++) {
      const shown = await page.$$eval('.order-item', els => els.map(e => e.children[1].textContent));
      const pos = shown.map(t => items.indexOf(t));
      if (pos.some(p => p < 0)) { fail(info.id + ': order item text did not match'); break; }
      const k = pos.findIndex((p, i) => i < pos.length - 1 && p > pos[i + 1]);
      if (k < 0) break;
      await page.locator('.order-item').nth(k).locator('button[aria-label="Move down"]').click();
    }
    await clickConf(conf);
  } else if (info.format === 'bucket') {
    const truth = await page.evaluate(() => Course.Learn.cur.q.items.map(it => it.bucket));
    const ids = await page.evaluate(() => Course.Learn.cur.q.buckets.map(b => b.id));
    const rows = page.locator('.b-item');
    for (let r = 0; r < await rows.count(); r++) {
      const i = +(await rows.nth(r).getAttribute('data-i'));
      const b = right ? truth[i] : ids.find(x => x !== truth[i]);
      await rows.nth(r).locator(`button[data-bucket="${b}"]`).click();
    }
    await clickConf(conf);
  } else {
    await page.fill('.answer-box', right ? 'A full answer that covers each key point in my own words.' : 'Not sure at all, to be honest.');
    await clickConf(conf);
    await wait(150);
    // without Claude grading the page falls back to a self-check against the key points
    const boxes = page.locator('.note.push .opt');
    const k = await boxes.count();
    if (!k && !(await page.locator('.note.probe, .note.ok').count())) fail(info.id + ': text answer showed neither a grade nor a self-check');
    if (right) for (let i = 0; i < k; i++) await boxes.nth(i).click();
    if (k) await page.click('text=Done checking');
  }
  await wait(150);
}

async function runFinal() {
  for (let i = 0; i < 12; i++) {
    await wait(120);
    // the result page leaves the last question in Course.Learn.cur, so read the page first
    if (!(await page.locator('.qcard .submit').count())) break;
    const info = await cur();
    if (!info || info.mode !== 'final') break;
    await answer(info, true, 'sure');
    await closeOverlay();
  }
  const title = await page.textContent('.page-title');
  if (!/Passed|Not yet/.test(title || '')) fail('final did not end on a result page');
  await shot('final');
  notes.push('final: ' + (title || '').trim());
  await page.locator('.btn.primary').first().click();
  await wait(200);
  // a pass returns to the map, so come back to the questions
  await page.goto(args.url + '#learn');
  await wait(200);
}

// ── start on the map ──
await page.goto(args.url + '#home', { waitUntil: 'networkidle' });
await page.waitForSelector('.mline', { timeout: 10000 }).catch(() => fail('the map did not render'));
await shot('map-start');

// ── placement ──
await page.goto(args.url + '#learn');
await page.waitForSelector('.page-title');
await page.locator('text=/Start placement|placement instead/').first().click();
let placed = 0;
for (;;) {
  await wait(120);
  if (await page.locator('text=Here is where you start').count()) break;
  const info = await cur();
  if (!info || info.mode !== 'placement' || placed > 12) { fail('placement did not reach the starting map'); break; }
  if (placed === 0) await shot('placement');
  await answer(info, placed % 2 === 0, placed % 3 === 0 ? 'guess' : 'sure');
  placed++;
}
if (!placed) fail('placement asked no questions');
await shot('placed');
await page.locator('.btn.primary').first().click();

// ── the loop ──
const seen = {}, modes = {};
let levelups = 0, wrongs = 0, probes = 0, told = 0, finals = 0, shuffled = false, mechHits = 0, retestSeen = false;
for (let n = 0; n < TARGET; n++) {
  await wait(120);
  let info = await cur();
  if (!info) { fail('no current question at step ' + n); await shot('stuck'); break; }
  if (info.mode === 'final') { await runFinal(); finals++; continue; }
  seen[info.format] = (seen[info.format] || 0) + 1;
  modes[info.mode] = (modes[info.mode] || 0) + 1;
  if (info.mode === 'retest') retestSeen = true;
  if (info.rel === 'mechanics') mechHits++;

  if (n === 0) {
    const diff = await page.textContent('.qhead .diff');
    if (!/Difficulty/.test(diff || '')) fail('difficulty dots have no text label');
    const classes = await page.$$eval('.submit .conf', els => els.map(e => e.className));
    if (classes.length !== 3 || new Set(classes).size !== 1) fail('the three confidence buttons do not share one style');
    await shot('question');
  }
  if (info.format === 'choice' && !shuffled) {
    shuffled = await page.evaluate(() => {
      const dom = Array.from(document.querySelectorAll('.qcard .opts .opt')).map(b => b.dataset.id);
      return dom.join() !== Course.Learn.cur.q.options.map(o => o.id).join();
    });
  }
  if (n === 2) { await page.getByRole('button', { name: 'Harder', exact: true }).click(); await page.getByRole('button', { name: 'Easier', exact: true }).click(); }

  if (n % 8 === 5) {
    // ask for the answer outright, which owes a re-test from another angle
    await page.click('.cmds >> text=Just tell me');
    told++;
  } else {
    if (n % 5 === 1 && info.format !== 'text') {
      await answer(info, false, 'sure');
      wrongs++;
      if (await page.locator('.note.probe').count()) { probes++; if (probes === 1) await shot('probe'); }
      else if (!(await page.locator('.note.told').count())) fail(info.id + ': a wrong answer showed no narrower question');
    }
    info = await cur();
    if (!info.resolved) await answer(info, true, n % 3 === 0 ? 'think' : 'sure');
    const ch = page.locator('text=I stand by my answer');
    if (await ch.count()) { await shot('challenge'); await ch.click(); await wait(120); }
  }
  if (await closeOverlay()) { levelups++; if (levelups === 1) notes.push('level-up overlay shown'); }

  info = await cur();
  if (!info.resolved) { fail(info.id + ': question did not resolve'); await shot('stuck'); break; }
  if (info.evidence && !(await page.locator('.evidence code').count())) fail(info.id + ': evidence lines did not render');
  if (info.owner && !(await page.locator('.note .so').count())) fail(info.id + ': owner line did not render');
  if (n === 3) await shot('resolved');

  const fin = page.locator('.note.primer >> text=Take the final');
  if (await fin.count() && !finals) { await fin.click(); await wait(150); continue; }
  const next = page.getByRole('button', { name: 'Next question' });
  if (!(await next.count())) { fail(`no Next button after ${info.id} (${info.format}, ${info.mode})`); await shot('stuck'); break; }
  await next.click();
}
if (!shuffled) fail('options were never shuffled');
if (mechHits) fail(mechHits + ' mechanics questions were asked while hidden');
if (told && !retestSeen) fail('an answer was given away but no re-test followed');
for (const f of ['choice', 'multi', 'order', 'bucket', 'text']) if (!seen[f]) notes.push('format not reached in this run: ' + f);

// ── the other views ──
for (const v of ['cards', 'questions', 'progress', 'home']) {
  await page.goto(args.url + '#' + v);
  await wait(250);
  const t = await page.locator('.view').count();
  if (!t) fail('view ' + v + ' did not render');
}
await page.goto(args.url + '#questions'); await wait(200);
const oq = page.locator('.oq-item input[type="checkbox"]');
if (await oq.count()) { await oq.first().check(); await page.fill('.oq-item textarea >> nth=0', 'Asked the branch manager.'); await page.locator('.oq-item textarea').first().dispatchEvent('change'); }
else fail('the open questions page lists nothing');
await shot('questions');
await page.goto(args.url + '#cards'); await wait(200);
const open = await page.locator('.ref:not(.locked)').count();
if (!open) fail('no card opened during the run');
await shot('cards');
await page.goto(args.url + '#progress'); await wait(200);
await page.click('.seg >> text=Included').catch(() => notes.push('no mechanics toggle on this course'));
await wait(150);
await shot('progress');
await page.goto(args.url + '#home'); await wait(1600);
await shot('map');

// ── phone width: no view may scroll sideways ──
await page.setViewportSize({ width: 390, height: 844 });
for (const v of ['home', 'learn', 'cards', 'questions', 'progress']) {
  await page.goto(args.url + '#' + v); await wait(250);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) fail(`view ${v} scrolls sideways at phone width (${over}px)`);
}
await shot('phone-question');
await page.setViewportSize({ width: 1280, height: 1000 });

// ── persistence: reload, then restore from the save block ──
const before = await page.evaluate(() => Course.app.engine.s.counter);
await page.reload({ waitUntil: 'networkidle' }); await wait(300);
const after = await page.evaluate(() => Course.app.engine.s.counter);
if (after !== before) fail(`progress did not survive a reload (${before} then ${after})`);
const oqKept = await page.evaluate(() => Object.values(Course.app.engine.s.open).some(o => o.done && o.note));
if (!oqKept) fail('the open question note did not survive a reload');
await page.goto(args.url + '#progress'); await wait(200);
const block = await page.evaluate(() => Course.app.engine.saveBlock());
await page.click('text=Erase progress'); await page.click('text=Yes, erase it'); await wait(200);
if (await page.evaluate(() => Course.app.engine.s.counter) !== 0) fail('erase did not reset progress');
await page.goto(args.url + '#progress'); await wait(200);
await page.fill('#resume-box', block); await page.click('text=Restore'); await wait(200);
if (await page.evaluate(() => Course.app.engine.s.counter) !== before) fail('restoring the save block did not bring progress back');

const fin = await page.evaluate(() => ({ counter: Course.app.engine.s.counter, xp: Course.app.engine.s.xp, cards: Object.keys(Course.app.engine.s.cards).length, map: Course.app.engine.ascii() }));
console.log('placement', placed, '| formats', JSON.stringify(seen), '| modes', JSON.stringify(modes));
console.log('wrong on purpose', wrongs, '| narrower questions', probes, '| asked for the answer', told, '| level-ups', levelups, '| finals', finals);
console.log('answered', fin.counter, '| xp', fin.xp, '| cards open', fin.cards, '| screenshots in', SHOTS);
console.log(fin.map);
notes.forEach(n => console.log('note: ' + n));
console.log(errors.length ? 'ERRORS:\n  ' + errors.join('\n  ') : 'no errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
