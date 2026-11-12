#!/usr/bin/env node
// Plays the course the way a learner would and reports every error it sees.
//
//   node learner_test.mjs --file <dir>/course.html --playwright <dir> [--shots <dir>] [--questions 40] [--expect-final]
//   node learner_test.mjs --url http://127.0.0.1:8765/course.html --playwright <dir> ...
//
// --file opens the built page from disk through a file:// URL, the way most learners will open it.
// --url takes any file:// or http:// address. --playwright is any folder whose node_modules holds
// `playwright`, so the kit needs no install of its own.
//
// The run takes the placement, answers questions through each component's controls (some wrong on
// purpose), checks written answers both ways (self-check and "Check with my agent"), then asks one
// question of every format by id and checks what each one hides and reveals, by keyboard where the
// component promises it. It visits every view, fails on sideways scroll at 390 px, reloads to check that
// progress persisted, downloads and loads a progress file, loads starting levels from a tutor's block,
// and fails on any request that leaves the page. With --expect-final it also fails when no final opened.
// It prints "no errors" or the list, and exits 1 on errors.
//
// Each question is answered through Course.Learn.autoAnswer(right), which calls the component's
// autoAnswer(q, el, right) hook. A component without that hook fails the test.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true;
  else { args[a.slice(2)] = next; i++; }
}
if (!(args.url || args.file) || !args.playwright) {
  console.error('usage: node learner_test.mjs --file <course.html> | --url <page url>  --playwright <dir with node_modules/playwright> [--shots <dir>] [--questions 40] [--expect-final]');
  process.exit(2);
}
const PAGE_URL = args.file ? pathToFileURL(path.resolve(args.file)).href : args.url;
const isFile = PAGE_URL.startsWith('file:');
const origin = isFile ? null : new URL(PAGE_URL).origin;
const SHOTS = path.resolve(args.shots || 'learner-shots');
const TARGET = parseInt(args.questions || '40', 10);
const FORMATS = ['choice', 'multi', 'order', 'bucket', 'text', 'reveal', 'replay', 'spot', 'estimate'];
fs.mkdirSync(SHOTS, { recursive: true });

const require = createRequire(path.join(path.resolve(args.playwright), 'package.json'));
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('@playwright/test')); }

const errors = [], notes = [];
const fail = msg => errors.push(msg);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce', acceptDownloads: true });
try { await ctx.grantPermissions(['clipboard-read', 'clipboard-write']); } catch (e) { notes.push('clipboard permissions not granted, so copying uses the fallback'); }
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') fail('console: ' + m.text().slice(0, 200)); });
page.on('pageerror', e => fail('page error: ' + String(e).slice(0, 300)));
// the course has to work offline, so anything that leaves the page is a failure
page.on('request', r => {
  const u = r.url();
  if (/^(file|data|blob|about):/.test(u) || (origin && u.startsWith(origin))) return;
  fail('outside request: ' + u.slice(0, 160));
});
const wait = ms => page.waitForTimeout(ms);
const go = async hash => { await page.goto(PAGE_URL + '#' + hash); await wait(200); };
const shot = (name, full) => page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full });
const cur = () => page.evaluate(() => {
  const c = Course.Learn.cur;
  return c ? { id: c.q.id, format: c.q.format, mode: c.mode, type: c.q.type, rel: c.q.rel || null, resume: c.q.resume || null, owner: !!c.q.owner, evidence: (c.q.evidence || []).length, resolved: !!c.resolved } : null;
});
// a value that leaked into the page as text, such as a null child or a number that failed to parse
const stray = async where => {
  const t = await page.evaluate(() => document.querySelector('#view').innerText);
  const m = /\b(null|undefined|NaN)\b/.exec(t);
  if (m) fail(where + ': the page shows the word "' + m[1] + '"');
};
const submitOpen = async () => (await page.locator('.qcard .submit:not([hidden])').count()) > 0;
const clickConf = conf => page.click(`.submit [data-conf="${conf}"]`);
async function closeOverlay() {
  const lu = page.locator('.levelup');
  if (await lu.count()) { await lu.click().catch(() => {}); await wait(120); return true; }
  return false;
}

// A written answer is checked one of two ways. Every other one goes to the agent path, and so does any
// answer that is wrong on purpose, because a failed self-check gives the answer away with no retry.
let writtenSeen = 0, agentChecks = 0, selfChecks = 0;
async function checkWritten(info, right, forceAgent) {
  const box = page.locator('.check-written');
  if (!(await box.count())) return;
  const viaAgent = forceAgent || (writtenSeen++ % 2 === 1);
  if (!viaAgent) {
    const ticks = box.locator('.checklist .opt');
    const k = await ticks.count();
    if (!k) { fail(info.id + ': the self-check showed no key points'); return; }
    if (right) for (let i = 0; i < k; i++) await ticks.nth(i).click();
    await box.locator('button:has-text("Done checking")').click();
    selfChecks++;
  } else {
    await box.locator('button:has-text("Check with my agent")').click();
    await wait(120);
    const prompt = await page.inputValue('.agent-prompt');
    const q = await page.evaluate(() => ({ prompt: Course.Learn.cur.q.prompt, answer: Course.Learn.cur.q.answer || '' }));
    if (!prompt.includes(q.prompt.slice(0, 50))) fail(info.id + ': the agent prompt does not hold the question');
    if (!/my own words|Not sure at all/.test(prompt)) fail(info.id + ': the agent prompt does not hold the learner answer');
    if (q.answer.length > 40 && prompt.includes(q.answer.slice(0, 60))) fail(info.id + ': the agent prompt gives away the reference answer');
    if (!/Got it/.test(prompt) || !/Not yet/.test(prompt)) fail(info.id + ': the agent prompt does not ask for Got it or Not yet');
    await page.locator('.check-written button', { hasText: right ? 'Got it' : 'Not yet' }).click();
    agentChecks++;
  }
  await wait(120);
}

// Answers the current question through its component. `right` false gives a wrong answer.
async function answer(info, right, conf, forceAgent) {
  if (!(await submitOpen())) return;
  const r = await page.evaluate(x => Course.Learn.autoAnswer(x), right);
  if (r !== 'ok') { fail(info.id + ': ' + r); return; }
  await clickConf(conf);
  await wait(150);
  await checkWritten(info, right, forceAgent);
}

// Keeps answering right until the question settles. A replay asks for one call per pause.
async function settle(conf) {
  for (let k = 0; k < 10; k++) {
    const ch = page.locator('text=I stand by my answer');
    if (await ch.count()) { await ch.click(); await wait(120); }
    const info = await cur();
    if (!info || info.resolved) return info;
    await answer(info, true, conf || 'sure');
  }
  return cur();
}

const finalStep = () => page.evaluate(() => (Course.app.final ? Course.app.final.i : null));
async function runFinal() {
  for (let i = 0; i < 14; i++) {
    await wait(120);
    const step = await finalStep();
    if (step === null) break;
    const info = await cur();
    // a replay asks for each of its calls before the final records it
    for (let k = 0; k < 6 && (await finalStep()) === step; k++) await answer(info, true, 'sure');
    await closeOverlay();
  }
  const title = await page.textContent('.page-title');
  if (!/Passed|Not yet/.test(title || '')) fail('final did not end on a result page');
  await shot('final');
  notes.push('final: ' + (title || '').trim());
  await page.locator('.btn.primary').first().click();
  await wait(200);
  // a pass returns to the map, so come back to the questions
  await go('learn');
}

// ── start on the map ──
await page.goto(PAGE_URL + '#home', { waitUntil: 'load' });
await page.waitForSelector('.mline', { timeout: 10000 }).catch(() => fail('the map did not render'));
await shot('map-start');

// ── placement ──
await go('learn');
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
    if (n % 5 === 1) {
      await answer(info, false, 'sure', true);
      wrongs++;
      if (await page.locator('.note.probe').count()) { probes++; if (probes === 1) await shot('probe'); }
      else if (!(await page.locator('.note.told').count())) fail(info.id + ': a wrong answer showed no narrower question');
    }
    await settle(n % 3 === 0 ? 'think' : 'sure');
  }
  if (await closeOverlay()) { levelups++; if (levelups === 1) notes.push('level-up overlay shown'); }

  info = await cur();
  if (!info.resolved) { fail(info.id + ': question did not resolve'); await shot('stuck'); break; }
  if (info.evidence && !(await page.locator('.evidence code').count())) fail(info.id + ': evidence lines did not render');
  if (info.owner && !(await page.locator('.note .so').count())) fail(info.id + ': owner line did not render');
  if (n === 3) await shot('resolved');
  await stray(info.id);

  const fin = page.locator('.note.primer >> text=Take the final');
  if (await fin.count() && !finals) { await fin.click(); await wait(150); continue; }
  const next = page.getByRole('button', { name: 'Next question' });
  if (!(await next.count())) { fail(`no Next button after ${info.id} (${info.format}, ${info.mode})`); await shot('stuck'); break; }
  await next.click();
}
if (!shuffled) fail('options were never shuffled');
if (mechHits) fail(mechHits + ' mechanics questions were asked while hidden');
if (told && !retestSeen) fail('an answer was given away but no re-test followed');
if (args['expect-final'] && !finals) fail('no final opened in ' + TARGET + ' questions');
if (!agentChecks) fail('no written answer went through "Check with my agent"');
if (!selfChecks) fail('no written answer went through the self-check');

// ── every component, asked by id ──
const byFormat = await page.evaluate(() => {
  const out = {};
  Object.values(Course.app.engine.byId).forEach(q => { if (!q.isFinal && q.rel !== 'mechanics' && !out[q.format]) out[q.format] = q.id; });
  return out;
});
const qOf = id => page.evaluate(i => Course.app.engine.byId[i], id);
const cardText = () => page.evaluate(() => document.querySelector('.qcard').innerText);
for (const f of FORMATS) {
  const id = byFormat[f];
  if (!id) { fail('the course has no ' + f + ' question to test'); continue; }
  await go('learn');
  if (!(await page.evaluate(i => Course.Learn.askById(i), id))) { fail(id + ': askById found no question'); continue; }
  await wait(150);
  const q = await qOf(id);
  let info = await cur();
  const hiddenLine = f === 'reveal' ? q.block.hidden.trim().split('\n')[0].trim() : '';

  // what has to stay hidden until the learner commits
  if (f === 'reveal' && (await cardText()).includes(hiddenLine)) fail(id + ': the hidden part shows before an answer');
  if (f === 'estimate' && await page.locator('.est-scale').count()) fail(id + ': the real value shows before an answer');
  if (f === 'replay') {
    if (!(await page.locator('.rp-track .rp-marker').count())) fail(id + ': the replay has no timeline marker');
    const before = await page.textContent('.rp-pos');
    // the replay plays by keyboard: focus the button and press Enter until the first pause
    for (let k = 0; k < q.steps.length && !(await page.locator('.rp-ask .opt').count()); k++) {
      await page.focus('.rp-next'); await page.keyboard.press('Enter'); await wait(80);
    }
    if (!(await page.locator('.rp-ask .opt').count())) fail(id + ': the replay never paused for a call');
    if ((await page.textContent('.rp-pos')) === before) fail(id + ': the timeline position did not move');
    const paused = q.steps.findIndex(s => s.pause);
    const shownBefore = await page.locator('.rp-step').count();
    if (shownBefore !== paused) fail(id + ': the replay showed ' + shownBefore + ' steps before the first pause, expected ' + paused);
    await shot('replay-mid');
  }
  if (f === 'spot') await shot('spot');
  await stray(id + ' before an answer');

  // a wrong answer first, which has to get a narrower question
  await answer(info, false, 'sure', true);
  if (!(await page.locator('.note.probe').count())) fail(id + ': a wrong ' + f + ' answer showed no narrower question');
  if (f === 'reveal' && (await cardText()).includes(hiddenLine)) fail(id + ': the hidden part shows after a miss');

  // then the right answer, by keyboard where the component promises it
  if (f === 'choice') {
    const pos = await page.evaluate(() => Array.from(document.querySelectorAll('.qcard .opts .opt')).findIndex(b => Course.Learn.cur.q.options.find(o => o.id === b.dataset.id).correct));
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('abcdef'[pos]);
    if ((await page.locator('.qcard .opts .opt').nth(pos).getAttribute('aria-checked')) !== 'true') fail(id + ': the letter key did not pick the option');
    await clickConf('sure');
    await wait(150);
  } else if (f === 'spot') {
    const n = q.block.body.split('\n').length;
    await page.focus('.spot-lines');
    await page.keyboard.press('Home');
    for (let i = 1; i <= n; i++) {
      const on = (await page.getAttribute(`.spot-line[data-n="${i}"]`, 'aria-selected')) === 'true';
      if (on !== q.lines.includes(i)) await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
    }
    const marked = await page.$$eval('.spot-line[aria-selected="true"]', els => els.map(e => +e.dataset.n));
    if (marked.join() !== q.lines.join()) fail(id + ': keyboard marking gave lines ' + marked.join() + ', expected ' + q.lines.join());
    await clickConf('sure');
    await wait(150);
  }
  info = await settle('sure');
  await closeOverlay();
  if (!info || !info.resolved) { fail(id + ': the ' + f + ' question did not resolve'); await shot('stuck-' + f); continue; }

  // what the component shows once the question is settled
  if (f === 'reveal' && !(await cardText()).includes(hiddenLine)) fail(id + ': the hidden part did not appear with the answer');
  if (f === 'estimate') {
    if (!(await page.locator('.est-scale .est-pin.real').count()) || !(await page.locator('.est-scale .est-pin.guess').count())) fail(id + ': the reveal does not show the guess and the real value');
    await shot('estimate');
  }
  if (f === 'spot' && (await page.locator('.spot-line.right').count()) !== q.lines.length) fail(id + ': the reveal does not mark the answer lines');
  if (f === 'replay' && (await page.locator('.rp-step').count()) !== q.steps.length) fail(id + ': the replay did not play every step once settled');
  if (f === 'order' && !(await page.locator('.order-item.settled').count())) fail(id + ': the order reveal did not show the correct order');
  if (f === 'bucket' && !(await page.locator('.b-item .why').count())) fail(id + ': the bucket reveal shows no reasons');
  if (f === 'reveal') await shot('reveal');
  await stray(id + ' once settled');
  notes.push('component ' + f + ' (' + id + ') passed');
}

// ── the other views ──
for (const v of ['cards', 'questions', 'progress', 'home']) {
  await go(v);
  if (!(await page.locator('.view').count())) fail('view ' + v + ' did not render');
  await stray('view ' + v);
}
await go('questions');
const oq = page.locator('.oq-item input[type="checkbox"]');
if (await oq.count()) { await oq.first().check(); await page.fill('.oq-item textarea >> nth=0', 'Asked the branch manager.'); await page.locator('.oq-item textarea').first().dispatchEvent('change'); }
else fail('the open questions page lists nothing');
await shot('questions');
await go('cards');
if (!(await page.locator('.ref:not(.locked)').count())) fail('no card opened during the run');
await shot('cards');
await go('progress');
await page.click('.seg >> text=Included').catch(() => notes.push('no mechanics toggle on this course'));
await wait(150);
await shot('progress', true);
await page.click('.seg >> text=Hidden').catch(() => {});
await go('home');
await wait(1400);
await shot('map');

// ── phone width: no view and no component may scroll sideways ──
await page.setViewportSize({ width: 390, height: 844 });
const over = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
for (const v of ['home', 'learn', 'cards', 'questions', 'progress']) {
  await go(v);
  const o = await over();
  if (o > 1) fail(`view ${v} scrolls sideways at phone width (${o}px)`);
}
for (const f of FORMATS) {
  if (!byFormat[f]) continue;
  await go('learn');
  await page.evaluate(i => Course.Learn.askById(i), byFormat[f]);
  await wait(150);
  let o = await over();
  if (o > 1) fail(`${f} question scrolls sideways at phone width (${o}px)`);
  await settle('sure');
  await closeOverlay();
  o = await over();
  if (o > 1) fail(`${f} question scrolls sideways at phone width once settled (${o}px)`);
  if (f === 'replay') await shot('phone-replay');
  if (f === 'estimate') await shot('phone-estimate');
}
await go('learn');
await shot('phone-question');
await page.setViewportSize({ width: 1280, height: 1000 });

// ── persistence: reload, then the save block, then a downloaded progress file ──
const counter = () => page.evaluate(() => Course.app.engine.s.counter);
const erase = async () => { await go('progress'); await page.click('text=Erase progress'); await page.click('text=Yes, erase it'); await wait(200); };
const before = await counter();
await page.reload({ waitUntil: 'load' }); await wait(300);
const after = await counter();
if (after !== before) fail(`progress did not survive a reload (${before} then ${after})`);
const oqKept = await page.evaluate(() => Object.values(Course.app.engine.s.open).some(o => o.done && o.note));
if (!oqKept) fail('the open question note did not survive a reload');
await go('progress');
const block = await page.evaluate(() => Course.app.engine.saveBlock());
for (const line of ['course state v1:', 'levels:', 'current focus:', 'needed the answer for:', 'recent misses:', 'blob:']) if (!block.includes(line)) fail('the save block has no "' + line + '" line');
await erase();
if (await counter() !== 0) fail('erase did not reset progress');
await go('progress');
await page.fill('#resume-box', block); await page.click('text=Restore'); await wait(200);
if (await counter() !== before) fail('restoring the save block did not bring progress back');

await go('progress');
const progressFile = path.join(SHOTS, 'progress.json');
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click('button:has-text("Download progress")')]).catch(e => { fail('download progress: ' + e.message.slice(0, 120)); return []; });
if (dl) {
  await dl.saveAs(progressFile);
  const pf = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
  if (pf.format !== 'course-progress' || !pf.state || pf.state.counter !== before) fail('the progress file does not hold the current state');
  if (!pf.summary || !pf.summary.levels || !String(pf.block || '').includes('course state v1:')) fail('the progress file has no summary or save block');
  await erase();
  await go('progress');
  await page.setInputFiles('#load-file', progressFile); await wait(300);
  if (await counter() !== before) fail('loading the progress file did not bring progress back');
}

// ── starting levels from a tutor: a progress file with a resume offer, then a block with no blob ──
const key = await page.evaluate(() => Course.app.course.storage_key);
const stops = await page.evaluate(() => Course.app.engine.lines[0].stops);
const resumeFile = path.join(SHOTS, 'resume.json');
fs.writeFileSync(resumeFile, JSON.stringify({ format: 'course-progress', version: 1, course: key, resume: { levels: { [stops[0]]: 2, [stops[1]]: 1 }, focus: stops[0] } }));
await erase();
await go('progress');
await page.setInputFiles('#load-file', resumeFile); await wait(300);
await go('learn');
if (!(await page.locator('text=Pick up where your last session stopped').count())) fail('a loaded resume offer did not show on the Learn page');
else {
  await shot('resume-offer');
  await page.click('text=Resume from that session'); await wait(200);
  const lv = await page.evaluate(s => Course.app.engine.level(s), stops[0]);
  if (lv !== 2) fail('the resume offer did not set the starting level (got ' + lv + ')');
  await page.locator('.btn.primary').first().click(); await wait(200);
  const first = await cur();
  const tagged = await page.evaluate(s => Course.app.engine.byStop[s].some(q => q.resume === 'open'), stops[0]);
  if (tagged && (!first || first.resume !== 'open')) fail('the question left open did not come first after a resume (got ' + (first && first.id) + ')');
}
await erase();
await go('progress');
await page.fill('#resume-box', 'course state v1: ' + key + '\nlevels: ' + stops[0] + '=3 ' + stops[1] + '=1\ncurrent focus: ' + stops[1] + '\nneeded the answer for: nothing yet\n');
await page.click('text=Restore'); await wait(200);
const offer = await page.evaluate(() => Course.app.engine.s.offer);
if (!offer || offer.levels[stops[0]] !== 3 || offer.focus !== stops[1]) fail('a save block with no blob was not read as starting levels');
await erase();
await go('progress');
await page.fill('#resume-box', 'course state v1: some-other-course\nlevels: ' + stops[0] + '=3\n');
await page.click('text=Restore'); await wait(200);
if (await page.evaluate(() => Course.app.engine.s.offer)) fail('a save block from another course was accepted');

const fin = await page.evaluate(() => ({ counter: Course.app.engine.s.counter, xp: Course.app.engine.s.xp }));
console.log('opened', isFile ? 'from disk (file://)' : 'over ' + origin);
console.log('placement', placed, '| formats in the loop', JSON.stringify(seen), '| modes', JSON.stringify(modes));
console.log('wrong on purpose', wrongs, '| narrower questions', probes, '| asked for the answer', told, '| level-ups', levelups, '| finals', finals);
console.log('written answers: self-checked', selfChecks, '| checked with an agent', agentChecks);
console.log('screenshots in', SHOTS);
notes.forEach(n => console.log('note: ' + n));
console.log(errors.length ? 'ERRORS:\n  ' + errors.join('\n  ') : 'no errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
