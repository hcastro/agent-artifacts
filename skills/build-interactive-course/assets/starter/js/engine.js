/* Course engine: the stop map, strict leveling, question selection and grading.
   Pure logic with no DOM, so it runs in the browser (window.Course) and in Node for tests.
   Everything that names the subject comes from content.course, which the build folds in from course.json. */
(function (root) {
  'use strict';
  const C = (root.Course = root.Course || {});

  const LEVELS = ['unaware', 'heard of it', 'can follow along', 'can do with help', 'can do independently', 'can teach it'];

  // What it takes to hold each level. Two different questions, one of them answered cold.
  const BAR = {
    1: { minD: 1, outs: ['clean', 'helped'] },
    2: { minD: 2, outs: ['clean', 'helped'] },
    3: { minD: 3, outs: ['clean', 'helped'] },
    4: { minD: 4, outs: ['clean'] },
    5: { minD: 5, outs: ['clean'], teach: true },
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function stopRecord() { return { base: 0, since: 0, ev: [], teach: false, last: -99 }; }

  // Per-stop records and per-line flags are filled in by the Engine, so a saved state survives
  // the author adding or removing stops.
  function newState(course) {
    return {
      v: 1, created: Date.now(), updated: Date.now(),
      target: course && course.target_level === 5 ? 5 : 4, bias: 0, sound: true, voice: false,
      placed: {}, mechanics: false, resumeQ: [], resumeLine: null,
      stops: {}, q: {}, ideas: {},
      counter: 0, lastReview: 0, retest: [],
      xp: 0, streak: 0, best: 0, days: {},
      calib: { sure: [0, 0], think: [0, 0], guess: [0, 0] },
      cards: {}, open: {}, log: [], finals: {},
      focus: null, line: null,
    };
  }

  function Engine(content, state, offer) {
    const course = content.course || {};
    this.c = content;
    this.course = course;
    this.s = state || newState(course);
    this.offer = offer !== undefined ? offer : (C.Store && C.Store.offer) || null;
    this.standings = (course.standings && course.standings.length ? course.standings : [[0, 'New']]).slice().sort((a, b) => a[0] - b[0]);
    this.byId = {};
    this.byStop = {};
    this.ideaOf = {};
    this.stops = {};
    this.lines = [];

    // Color is fixed by position in course.json, so a line keeps its color when another one is dropped.
    const all = (course.lines || []).map((l, i) => ({
      id: l.id, name: l.name, short: l.short || l.name, about: l.about || '', color: (i % 4) + 1,
      stops: (l.stops || []).map(st => st.id), meta: l.stops || [],
      placement: (l.placement && l.placement.length ? l.placement : (l.stops || []).map(st => st.id)),
    }));
    // A line with a stop that has no questions yet is left off the map. One line always stays.
    const full = all.filter(l => l.stops.every(k => ((((content.stops || {})[k]) || {}).questions || []).length > 0));
    this.lines = full.length ? full : all.slice(0, 1);
    this.lines.forEach(l => l.meta.forEach(st => { this.stops[st.id] = { id: st.id, name: st.name, tag: st.tag || st.name, about: st.about || '', line: l.id, color: l.color }; }));

    Object.keys(this.stops).forEach(k => {
      const sk = (content.stops || {})[k] || {};
      this.byStop[k] = sk.questions || [];
      (sk.questions || []).forEach(q => { q.stop = k; this.byId[q.id] = q; });
      (sk.finals || []).forEach(q => { q.stop = k; q.isFinal = true; this.byId[q.id] = q; });
      (sk.ideas || []).forEach(i => { this.ideaOf[i.id] = Object.assign({ stop: k }, i); });
      if (!this.s.stops[k]) this.s.stops[k] = stopRecord();
    });

    const s = this.s;
    this.lines.forEach(l => { if (s.placed[l.id] === undefined) s.placed[l.id] = false; });
    if (!s.resumeQ) s.resumeQ = [];
    if (!this.lines.some(l => s.placed[l.id]) && !s.log.length) { s.line = this.lines[0].id; s.focus = null; }
    if (!this.lines.find(l => l.id === s.line)) s.line = this.lines[0].id;
    if (s.focus && !this.stops[s.focus]) s.focus = null;
  }

  const E = Engine.prototype;

  E.lineById = function (id) { return this.lines.find(l => l.id === id); };
  E.lineOf = function (stop) { return this.lines.find(l => l.stops.indexOf(stop) >= 0); };

  // ── levels ────────────────────────────────────────────────────────────────
  E.meets = function (stop, L) {
    const st = this.s.stops[stop];
    const bar = BAR[L];
    const ok = st.ev.filter(e => e.c >= st.since && e.d >= bar.minD && bar.outs.indexOf(e.out) >= 0);
    const distinct = {};
    ok.forEach(e => { distinct[e.q] = distinct[e.q] || !!e.cold; });
    const ids = Object.keys(distinct);
    const cold = ids.some(id => distinct[id]);
    return { have: Math.min(ids.length, 2), need: 2, cold: cold, teach: !bar.teach || st.teach, pass: ids.length >= 2 && cold && (!bar.teach || st.teach) };
  };

  E.level = function (stop) {
    const st = this.s.stops[stop];
    if (!st) return 0;
    let L = st.base;
    for (let n = 5; n > st.base; n--) { if (this.meets(stop, n).pass) { L = n; break; } }
    return L;
  };

  E.nextBar = function (stop) {
    const L = this.level(stop);
    if (L >= 5) return null;
    const m = this.meets(stop, L + 1);
    const bar = BAR[L + 1];
    return {
      level: L + 1, name: LEVELS[L + 1], have: m.have, need: 2, cold: m.cold, minD: bar.minD,
      cleanOnly: bar.outs.length === 1, teach: !!bar.teach, teachDone: this.s.stops[stop].teach,
    };
  };

  E.linePct = function (lid) {
    const t = this.lineById(lid);
    const sum = t.stops.reduce((a, k) => a + this.level(k), 0);
    return Math.round((sum / (t.stops.length * 5)) * 100);
  };
  E.overall = function () {
    const ks = Object.keys(this.stops);
    return Math.round((ks.reduce((a, k) => a + this.level(k), 0) / (ks.length * 5)) * 100);
  };
  E.rank = function () {
    const p = this.overall();
    let r = this.standings[0][1];
    this.standings.forEach(x => { if (p >= x[0]) r = x[1]; });
    return r;
  };
  E.mastered = function (lid) {
    const t = this.lineById(lid);
    return t.stops.every(k => this.level(k) >= this.s.target);
  };

  // ── placement ─────────────────────────────────────────────────────────────
  E.diagnosticSet = function (lid) {
    const t = this.lineById(lid);
    const out = [];
    t.placement.forEach(k => {
      const qs = (this.byStop[k] || []).filter(x => !x.resume && (x.rel !== 'mechanics' || this.s.mechanics));
      const q = qs.find(x => x.diagnostic && x.format === 'choice') || qs.find(x => x.format === 'choice' && x.difficulty >= 2 && x.difficulty <= 3) || qs.find(x => x.format === 'choice');
      if (q) out.push(q);
    });
    return out.sort((x, y) => x.difficulty - y.difficulty);
  };

  E.applyDiagnostic = function (lid, results) {
    const t = this.lineById(lid);
    results.forEach(r => {
      const q = this.byId[r.q];
      if (!q) return;
      const st = this.s.stops[q.stop];
      st.base = r.ok ? (r.conf === 'guess' ? 1 : 2) : 0;
      st.since = this.s.counter;
      this.s.q[q.id] = { n: 1, res: r.ok ? 'diag-ok' : 'diag-miss', last: this.s.counter };
      this._calib(r.conf, r.ok);
    });
    this.s.placed[lid] = true;
    this.s.line = lid;
    this.s.focus = this.suggestFocus(lid);
    this._touch();
    return t.stops.map(k => ({ stop: k, level: this.level(k) }));
  };

  // A resume offer is a set of starting levels kept in one viewer's private record, so only that
  // viewer sees it. Everyone else starts the line with the placement.
  E.offerLine = function () {
    const o = this.offer;
    if (!o || !o.levels) return null;
    if (o.line && this.lineById(o.line)) return this.lineById(o.line);
    const k = Object.keys(o.levels).find(x => this.stops[x]);
    return k ? this.lineOf(k) : null;
  };
  E.canResume = function (lid) {
    const t = this.offerLine();
    return !!t && (!lid || t.id === lid) && !this.s.placed[t.id];
  };
  E.applyResume = function () {
    const s = this.s, t = this.offerLine();
    const lv = this.offer.levels;
    Object.keys(lv).forEach(k => { const st = s.stops[k]; if (st) { st.base = clamp(parseInt(lv[k], 10) || 0, 0, 3); st.since = s.counter; } });
    s.placed[t.id] = true; s.line = t.id; s.resumeLine = t.id;
    const tagged = [];
    t.stops.forEach(k => (this.byStop[k] || []).forEach(q => { if (q.resume) tagged.push(q); }));
    const left = tagged.find(q => q.resume === 'open');
    // focus where the earlier session stopped: the offer says so, or the question it left open does
    s.focus = this.offer.focus && t.stops.indexOf(this.offer.focus) >= 0 ? this.offer.focus : left ? left.stop : this.suggestFocus(t.id);
    // the question left open at the focus stop comes first, then earlier misconceptions, asked cold
    const first = tagged.filter(q => q.resume === 'open' && q.stop === s.focus);
    const rest = tagged.filter(q => first.indexOf(q) < 0).sort((x, y) => (x.resume === y.resume ? 0 : x.resume === 'misconception' ? -1 : 1));
    s.resumeQ = first.concat(rest).map((q, i) => ({ q: q.id, due: s.counter + i * 3 }));
    this._touch();
    return t.stops.map(k => ({ stop: k, level: this.level(k) }));
  };

  E.hiddenCount = function () {
    let n = 0;
    Object.keys(this.byStop).forEach(k => this.byStop[k].forEach(q => { if (q.rel === 'mechanics') n += 1; }));
    return n;
  };

  E.suggestFocus = function (lid) {
    const t = this.lineById(lid || this.s.line) || this.lines[0];
    let best = null;
    t.stops.forEach(k => {
      const L = this.level(k);
      if (L >= this.s.target) return;
      if (best === null || L < this.level(best)) best = k;
    });
    return best || t.stops[0];
  };

  // ── choosing the next question ────────────────────────────────────────────
  E._pool = function (stop, opts) {
    const s = this.s;
    return (this.byStop[stop] || []).filter(q => {
      if (q.type === 'teach') return false;
      // details a learner could look up stay out unless they ask for them
      if (q.rel === 'mechanics' && !s.mechanics) return false;
      const rec = s.q[q.id];
      if (rec && s.counter - rec.last < (opts.gap || 12)) return false;
      if (opts.skipClean && rec && rec.res === 'clean') return false;
      if (opts.avoid && opts.avoid.indexOf(q.id) >= 0) return false;
      if (opts.idea && q.idea !== opts.idea) return false;
      return true;
    });
  };

  const REL_RANK = { useful: 1, mechanics: 2 };
  E._rank = function (list, target) {
    const s = this.s;
    return list.slice().sort((x, y) => {
      const dx = Math.abs(x.difficulty - target), dy = Math.abs(y.difficulty - target);
      if (dx !== dy) return dx - dy;
      // questions that bear on a decision come before the merely useful ones
      const rx = REL_RANK[x.rel] || 0, ry = REL_RANK[y.rel] || 0;
      if (rx !== ry) return rx - ry;
      const nx = (s.q[x.id] || { n: 0 }).n, ny = (s.q[y.id] || { n: 0 }).n;
      if (nx !== ny) return nx - ny;
      return x.id < y.id ? -1 : 1;
    });
  };

  E.teachDue = function (stop) {
    const st = this.s.stops[stop];
    if (st.teach || this.level(stop) < 4) return null;
    const ok = st.ev.filter(e => e.c >= st.since && e.d >= BAR[5].minD && e.out === 'clean');
    const ids = {};
    ok.forEach(e => { ids[e.q] = 1; });
    if (Object.keys(ids).length < 2) return null;
    return (this.byStop[stop] || []).find(q => q.type === 'teach') || null;
  };

  E.next = function () {
    const s = this.s;
    // 1. a re-test owed after an answer was given away
    const due = s.retest.find(r => r.due <= s.counter);
    if (due) {
      let pool = this._pool(due.stop, { idea: due.idea, avoid: [due.avoid], gap: 1 });
      if (!pool.length) pool = this._pool(due.stop, { avoid: [due.avoid], gap: 1 }).filter(q => Math.abs(q.difficulty - due.d) <= 1);
      s.retest = s.retest.filter(r => r !== due);
      if (pool.length) return { q: this._rank(pool, due.d)[0], mode: 'retest', cold: false };
    }
    const focus = s.focus || this.suggestFocus();
    // 1b. questions carried over from a resumed session, asked cold
    if (s.resumeLine && this.lineOf(focus).id === s.resumeLine) {
      const rq = (s.resumeQ || []).find(r => r.due <= s.counter && this.byId[r.q]);
      if (rq) { const q = this.byId[rq.q]; return { q: q, mode: q.stop === focus ? 'focus' : 'review', cold: true }; }
    }
    // 2. an unannounced spaced review of another stop
    if (s.counter - s.lastReview >= 4) {
      const cands = Object.keys(this.stops).filter(k => k !== focus && this.level(k) >= 1 && s.counter - s.stops[k].last >= 6 && s.placed[this.lineOf(k).id]);
      if (cands.length) {
        cands.sort((x, y) => s.stops[x].last - s.stops[y].last);
        const k = cands[0];
        const pool = this._pool(k, { gap: 20 });
        if (pool.length) return { q: this._rank(pool, clamp(this.level(k), 1, 5))[0], mode: 'review', cold: true };
      }
    }
    // 3. the teach-back that unlocks level 5
    const teach = this.teachDue(focus);
    if (teach) return { q: teach, mode: 'teach', cold: true };
    // 4. the focus stop, one notch above the current level
    const L = this.level(focus);
    const target = clamp(L + 1 + s.bias, 1, 5);
    let pool = this._pool(focus, { skipClean: true });
    if (!pool.length) pool = this._pool(focus, { gap: 6 });
    if (!pool.length) pool = this._pool(focus, { gap: 1 });
    if (!pool.length) return null;
    const q = this._rank(pool, target)[0];
    const idea = s.ideas[q.idea] || {};
    const prev = s.log.length ? this.byId[s.log[s.log.length - 1].q] : null;
    const recentlyTold = idea.told !== undefined && s.counter - idea.told < 5;
    const recentlyPrimed = idea.primed !== undefined && s.counter - idea.primed < 2;
    const cold = !recentlyTold && !recentlyPrimed && !(prev && prev.idea === q.idea);
    const needPrimer = idea.primed === undefined && L <= 1 && this.ideaOf[q.idea] && this.ideaOf[q.idea].primer;
    return { q: q, mode: 'focus', cold: cold, primer: needPrimer ? this.ideaOf[q.idea] : null };
  };

  E.markPrimed = function (ideaId) {
    this.s.ideas[ideaId] = Object.assign({}, this.s.ideas[ideaId], { primed: this.s.counter });
  };

  // ── recording an answered question ────────────────────────────────────────
  E._calib = function (conf, ok) {
    if (!conf || !this.s.calib[conf]) return;
    this.s.calib[conf][1] += 1;
    if (ok) this.s.calib[conf][0] += 1;
  };

  E._touch = function () {
    const s = this.s;
    s.updated = Date.now();
    const d = today();
    s.days[d] = (s.days[d] || 0);
  };

  // outcome: { out: 'clean'|'helped'|'told', attempts, conf, firstTry, mode, cold, teachPass }
  E.record = function (qid, o) {
    const s = this.s, q = this.byId[qid];
    const stop = q.stop, st = s.stops[stop];
    const before = this.level(stop);
    const beforeRank = this.rank();
    s.counter += 1;
    const rec = s.q[qid] || { n: 0 };
    rec.n += 1; rec.res = o.out; rec.last = s.counter;
    s.q[qid] = rec;
    st.last = s.counter;
    if (s.resumeQ && s.resumeQ.length) s.resumeQ = s.resumeQ.filter(r => r.q !== qid);
    if (o.mode === 'review') s.lastReview = s.counter;
    this._calib(o.conf, o.firstTry);

    let demoted = false;
    if (q.type === 'teach') {
      if (o.teachPass) st.teach = true;
    } else if (o.mode === 'review' && o.out === 'told') {
      // a failed surprise review costs a level and voids the evidence before it
      st.base = Math.max(0, before - 1);
      st.since = s.counter;
      st.teach = false;
      demoted = true;
    } else {
      st.ev.push({ q: qid, d: q.difficulty, out: o.out, cold: !!o.cold, c: s.counter });
      if (st.ev.length > 40) st.ev = st.ev.slice(-40);
    }

    const idea = Object.assign({}, s.ideas[q.idea]);
    if (o.out === 'told') {
      idea.told = s.counter; idea.misses = (idea.misses || 0) + 1;
      s.retest.push({ stop: stop, idea: q.idea, avoid: qid, d: q.difficulty, due: s.counter });
    } else if (o.out === 'clean') { idea.ok = (idea.ok || 0) + 1; }
    s.ideas[q.idea] = idea;

    let xp = 0;
    if (o.out === 'clean') { xp = 10 * q.difficulty; if (o.conf === 'sure') xp = Math.round(xp * 1.2); s.streak += 1; }
    else if (o.out === 'helped') { xp = 4 * q.difficulty; s.streak = 0; }
    else { s.streak = 0; }
    if (q.type === 'teach' && o.teachPass) xp += 60;
    s.best = Math.max(s.best, s.streak);
    s.xp += xp;
    const d = today();
    s.days[d] = (s.days[d] || 0) + 1;

    // reference cards open once the learner answers a question on one of their ideas without being told
    const unlocked = [];
    if (o.out !== 'told') {
      ((this.c.stops[stop] || {}).cards || []).forEach(card => {
        if (s.cards[card.id]) return;
        if ((card.ideas || []).indexOf(q.idea) >= 0) { s.cards[card.id] = Date.now(); unlocked.push(card); }
      });
    }

    s.log.push({ q: qid, out: o.out, a: o.attempts || 1, conf: o.conf || null, mode: o.mode, t: Date.now() });
    if (s.log.length > 120) s.log = s.log.slice(-120);

    const after = this.level(stop);
    const line = this.lineOf(stop);
    let moved = null;
    if (after >= s.target && before < s.target && s.focus === stop) {
      s.focus = this.suggestFocus(line.id);
      moved = s.focus;
    }
    this._touch();
    return {
      xp: xp, streak: s.streak, unlocked: unlocked, demoted: demoted,
      levelChange: after !== before ? { stop: stop, from: before, to: after } : null,
      rankChange: this.rank() !== beforeRank ? this.rank() : null,
      lineMastered: after !== before && this.mastered(line.id) ? line.id : null,
      focusMoved: moved,
      bar: this.nextBar(stop),
    };
  };

  // ── final mixed assessment ────────────────────────────────────────────────
  E.buildFinal = function (lid) {
    const t = this.lineById(lid);
    const list = [];
    t.stops.forEach(k => {
      let pool = this._pool(k, { gap: 1 }).filter(q => q.difficulty >= 3 && q.format !== 'text');
      pool = pool.length ? pool : this._pool(k, { gap: 1 });
      const fresh = pool.filter(q => !this.s.q[q.id]);
      const pick = this._rank(fresh.length ? fresh : pool, 4)[0];
      if (pick) list.push(pick);
    });
    const finals = [];
    t.stops.forEach(k => ((this.c.stops[k] || {}).finals || []).forEach(f => finals.push(f)));
    const unseen = finals.filter(f => !this.s.q[f.id]);
    const integ = (unseen.length ? unseen : finals)[0];
    if (integ) list.push(integ);
    return list;
  };

  E.recordFinal = function (lid, results) {
    const misses = results.filter(r => !r.ok);
    const integ = results.find(r => this.byId[r.q] && this.byId[r.q].isFinal);
    const pass = misses.length <= 1 && (!integ || integ.ok);
    results.forEach(r => {
      const q = this.byId[r.q];
      if (!q) return;
      this.s.counter += 1;
      this.s.q[r.q] = { n: ((this.s.q[r.q] || {}).n || 0) + 1, res: r.ok ? 'clean' : 'told', last: this.s.counter };
      if (!r.ok && !q.isFinal) {
        const st = this.s.stops[q.stop];
        st.base = Math.max(0, this.level(q.stop) - 1);
        st.since = this.s.counter;
      }
    });
    this.s.finals[lid] = { pass: pass, at: Date.now(), score: results.length - misses.length, of: results.length };
    if (pass) this.s.xp += 300;
    else this.s.focus = this.suggestFocus(lid);
    this._touch();
    return { pass: pass, weakest: this.weakest(lid) };
  };

  E.weakest = function (lid) {
    const t = this.lineById(lid);
    return t.stops.map(k => {
      const told = this.s.log.filter(l => this.byId[l.q] && this.byId[l.q].stop === k && l.out === 'told').length;
      return { stop: k, level: this.level(k), told: told };
    }).sort((x, y) => (x.level - y.level) || (y.told - x.told)).slice(0, 3);
  };

  // ── commands ──────────────────────────────────────────────────────────────
  E.harder = function () { this.s.bias = clamp(this.s.bias + 1, -2, 3); return this.s.bias; };
  E.easier = function () { this.s.bias = clamp(this.s.bias - 1, -2, 3); return this.s.bias; };
  E.setFocus = function (stop) { this.s.focus = stop; this.s.line = this.lineOf(stop).id; this._touch(); };
  E.setTarget = function (n) { this.s.target = n === 5 ? 5 : 4; this._touch(); };

  E.ascii = function () {
    const out = [];
    const bar = (n, of) => '█'.repeat(n) + '░'.repeat(of - n);
    const pct = this.overall();
    out.push(('Topic: ' + (this.course.topic || this.course.title || '')).padEnd(48) + ' overall: ' + bar(Math.round(pct / 10), 10) + ' ' + pct + '%');
    this.lines.forEach(t => {
      out.push('-'.repeat(69));
      out.push(t.name + '  ' + this.linePct(t.id) + '%');
      t.stops.forEach(k => {
        const L = this.level(k);
        let note = '';
        if (k === this.s.focus) note = '<- current focus';
        else if (L >= 5) note = '* can teach it';
        else if (L >= 4) note = '* independent';
        out.push(this.stops[k].name.padEnd(36).slice(0, 36) + ' [' + bar(L * 2, 10) + ']  ' + L + '/5  ' + note);
      });
    });
    out.push('-'.repeat(69));
    return out.join('\n');
  };

  E.saveBlock = function () {
    const s = this.s;
    const levels = Object.keys(this.stops).map(k => k + '=' + this.level(k)).join(' ');
    const mis = Object.keys(s.ideas).filter(i => (s.ideas[i].misses || 0) > 0)
      .sort((x, y) => s.ideas[y].misses - s.ideas[x].misses).slice(0, 12)
      .map(i => (this.ideaOf[i] ? this.ideaOf[i].name : i) + ' (' + i + ', given away ' + s.ideas[i].misses + 'x)');
    const outs = { clean: 0, helped: 0, told: 0 };
    s.log.forEach(l => { outs[l.out] = (outs[l.out] || 0) + 1; });
    let blob = '';
    try {
      const json = JSON.stringify(s);
      blob = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
    } catch (e) { blob = ''; }
    return [
      'course state v1: ' + (this.course.storage_key || this.course.title || ''),
      'topic: ' + (this.course.topic || '') + ' (Socratic tutor)',
      'target level: ' + s.target + '/5   difficulty bias: ' + s.bias,
      'levels: ' + levels,
      'current focus: ' + (s.focus || 'none') + (s.focus && this.stops[s.focus] ? ' (' + this.stops[s.focus].name + ')' : ''),
      'covered: ' + s.counter + ' questions (' + outs.clean + ' first try, ' + outs.helped + ' with a nudge, ' + outs.told + ' given away)',
      'misconceptions: ' + (mis.length ? mis.join('; ') : 'none recorded yet'),
      'placement done: ' + this.lines.map(t => t.short.toLowerCase() + ' ' + (s.placed[t.id] ? 'yes' : 'no')).join(', '),
      'mechanics questions: ' + (s.mechanics ? 'included' : 'hidden'),
      'blob: ' + blob,
    ].join('\n');
  };

  Engine.parseBlock = function (text) {
    const m = /blob:\s*([A-Za-z0-9+/=]+)/.exec(text || '');
    if (!m) return null;
    try {
      const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(m[1]))) : Buffer.from(m[1], 'base64').toString('utf8');
      const s = JSON.parse(json);
      return s && s.v === 1 && s.stops ? s : null;
    } catch (e) { return null; }
  };

  // ── grading the closed formats ────────────────────────────────────────────
  const Grade = {
    choice: function (q, picked) {
      const opt = (q.options || []).find(o => o.id === picked);
      const ok = !!(opt && opt.correct);
      return { ok: ok, probe: ok ? null : (opt && opt.probe) || null };
    },
    multi: function (q, picked) {
      const set = {};
      (picked || []).forEach(id => { set[id] = true; });
      let probe = null, ok = true;
      (q.options || []).forEach(o => {
        const chosen = !!set[o.id];
        if (chosen !== !!o.correct) { ok = false; if (!probe && chosen && o.probe) probe = o.probe; }
      });
      if (!ok && !probe) {
        const missed = (q.options || []).find(o => o.correct && !set[o.id] && o.probe);
        probe = missed ? missed.probe : null;
      }
      return { ok: ok, probe: probe };
    },
    order: function (q, seq) {
      const items = q.items || [];
      let right = 0;
      items.forEach((it, i) => { if (seq[i] === i) right += 1; });
      return { ok: right === items.length, probe: null, hint: null };
    },
    bucket: function (q, placed) {
      const items = q.items || [];
      let right = 0;
      items.forEach((it, i) => { if (placed[i] === it.bucket) right += 1; });
      return { ok: right === items.length, probe: null, hint: right + ' of ' + items.length + ' are in the right place.' };
    },
  };

  C.LEVELS = LEVELS; C.BAR = BAR;
  C.Engine = Engine; C.Grade = Grade; C.newState = newState;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
