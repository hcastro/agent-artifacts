/* Course question loop. One question at a time. A miss gets a narrower question, and the answer
   shows only after three misses or when the learner asks. Levels move only on the engine's evidence rules. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});
  const h = C.h, icon = C.icon, md = C.md;
  const TYPE = { predict: 'predict the outcome', explain: 'explain why', flaw: 'find the flaw', apply: 'apply it', connect: 'connect two ideas', teach: 'teach it back' };
  const SMALL = 'muted small-note';

  // the dots carry a visible word so difficulty does not depend on reading a pattern
  function dots(d) {
    const s = h('span', { class: 'dots', 'aria-hidden': 'true' });
    for (let i = 1; i <= 5; i++) s.appendChild(h('i', { class: i <= d ? 'on' : '' }));
    return h('span', { class: 'diff', title: 'Difficulty ' + d + ' of 5', 'aria-label': 'Difficulty ' + d + ' of 5' }, h('span', null, 'Difficulty'), s);
  }
  function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = r[i]; r[i] = r[j]; r[j] = t; } return r; }
  function solo() { return h('div', { class: 'learn solo' }, ...arguments); }

  const Learn = {
    render(root) {
      const app = C.app, eng = app.engine;
      this.root = root;
      if (app.final) return this.finalStep();
      const lid = eng.s.line || eng.lines[0].id;
      if (!eng.s.placed[lid]) return this.placement(lid);
      this.ask();
    },

    // ── placement: a short diagnostic, with no teaching until it is done ──
    placement(lid) {
      const app = C.app, eng = app.engine, root = this.root;
      const line = eng.lineById(lid);
      const set = eng.diagnosticSet(lid);
      root.innerHTML = '';
      const others = eng.lines.filter(t => t.id !== lid).map(t => h('button', { class: 'btn quiet', onclick: () => { eng.s.line = t.id; app.save(); this.render(root); } }, 'Start with ' + t.name.toLowerCase() + ' instead'));
      const start = () => this.diag(lid, set, 0, []);
      if (eng.canResume(lid)) {
        const lv = eng.offer.levels;
        root.appendChild(solo(h('div', { class: 'card qcard build' },
          h('span', { class: 'eyebrow' }, line.name),
          h('h1', { class: 'page-title', style: { marginTop: '8px' } }, 'Pick up where your last session stopped.'),
          h('p', { class: 'page-sub' }, 'An earlier session placed you on this line: ' + Object.keys(lv).filter(k => eng.stops[k]).map(k => eng.stops[k].tag + ' ' + lv[k]).join(', ') + '. Each level was reached with help, so the question you left open comes first and the earlier misconceptions come back cold.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn primary', onclick: () => { const map = eng.applyResume(); app.save(); this.placed(lid, map); } }, 'Resume from that session'),
            h('button', { class: 'btn', onclick: start }, 'Take the ' + set.length + '-question placement instead')),
          others.length ? h('div', { class: 'row', style: { marginTop: '10px' } }, others) : null)));
        return;
      }
      root.appendChild(solo(h('div', { class: 'card qcard build' },
        h('span', { class: 'eyebrow' }, 'Placement: ' + line.name),
        h('h1', { class: 'page-title', style: { marginTop: '8px' } }, 'First, ' + set.length + ' questions to see what you already know.'),
        h('p', { class: 'page-sub' }, 'The questions come one at a time and get harder as they go. You will not be told whether you were right until you have answered the last one. Your answers set a starting level at each stop, and from there you earn every level.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: start }, 'Start placement'), others))));
    },

    diag(lid, set, i, results) {
      const app = C.app, eng = app.engine;
      if (i >= set.length) {
        const map = eng.applyDiagnostic(lid, results);
        app.save();
        return this.placed(lid, map);
      }
      const q = set[i];
      this.cur = { q: q, mode: 'placement', attempts: 0, diag: true };
      this.paint({ q: q, mode: 'placement', label: 'Placement ' + (i + 1) + ' of ' + set.length }, (answer, conf) => {
        const g = C.Grade.choice(q, answer);
        results.push({ q: q.id, ok: g.ok, conf: conf });
        C.Sound.tick();
        this.diag(lid, set, i + 1, results);
      });
    },

    placed(lid, map) {
      const app = C.app, eng = app.engine, root = this.root;
      root.innerHTML = '';
      const list = h('div', { class: 'stack', style: { gap: '4px' } });
      map.forEach(m => {
        const sk = eng.stops[m.stop];
        list.appendChild(h('button', { class: 'span-row line-' + sk.color + (m.stop === eng.s.focus ? ' focus' : ''), onclick: () => { eng.setFocus(m.stop); app.save(); this.placed(lid, map); } },
          h('span', { class: 'name' }, sk.name),
          h('span', { class: 'span-track' }, h('span', { class: 'span-fill', style: { width: (m.level / 5 * 100) + '%' } })),
          h('span', { class: 'lvl num' }, m.level + '/5')));
      });
      const focus = eng.stops[eng.s.focus];
      root.appendChild(solo(h('div', { class: 'card qcard build' },
        h('span', { class: 'eyebrow' }, 'Your starting map'),
        h('h1', { class: 'page-title', style: { marginTop: '8px' } }, 'Here is where you start.'),
        h('p', { class: 'page-sub' }, 'Stops the placement did not cover start at 0. I would begin with ' + focus.name.toLowerCase() + ', and you can pick any other row instead.'),
        list,
        h('div', { class: 'row', style: { marginTop: '16px' } }, h('button', { class: 'btn primary', onclick: () => this.ask() }, 'Start with ' + focus.tag)))));
    },

    // ── the teaching loop ──
    ask() {
      const app = C.app, eng = app.engine;
      const nx = eng.next();
      if (!nx) {
        this.root.innerHTML = '';
        this.root.appendChild(solo(h('div', { class: 'card qcard' }, h('h1', { class: 'page-title' }, 'No question is ready at this stop.'), h('p', { class: 'page-sub' }, 'Pick another stop on the map.'), h('button', { class: 'btn primary', onclick: () => app.go('home') }, 'Open the map'))));
        return;
      }
      this.cur = { q: nx.q, mode: nx.mode, cold: nx.cold, attempts: 0, primer: nx.primer, firstTry: null };
      if (nx.primer) eng.markPrimed(nx.primer.id);
      const label = nx.mode === 'review' ? 'Surprise review' : nx.mode === 'retest' ? 'Re-test from a different angle' : nx.mode === 'teach' ? 'Teach-back for level 5' : null;
      this.paint({ q: nx.q, mode: nx.mode, label: label, primer: nx.primer }, (answer, conf) => this.submit(answer, conf));
    },

    paint(o, onSubmit) {
      const app = C.app, eng = app.engine, root = this.root, q = o.q, sk = eng.stops[q.stop];
      root.innerHTML = '';
      const notes = h('div', { 'aria-live': 'polite' });
      const answerUi = h('div');
      const submitRow = h('div', { class: 'submit' });
      let getAnswer = () => null, lock = () => {};
      this.ui = { notes: notes, answerUi: answerUi, submitRow: submitRow };
      const shaker = el => () => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

      if (q.format === 'choice' || q.format === 'multi') {
        const picked = {};
        const box = h('div', { class: 'opts', role: q.format === 'choice' ? 'radiogroup' : 'group', 'aria-label': 'Answer options' });
        // shuffled so the correct option has no favored position
        shuffle(q.options).forEach((op, i) => {
          const b = h('button', { class: 'opt', role: q.format === 'choice' ? 'radio' : 'checkbox', 'aria-checked': 'false', data: { id: op.id }, onclick: () => {
            if (q.format === 'choice') { Object.keys(picked).forEach(k => delete picked[k]); Array.from(box.children).forEach(c => c.setAttribute('aria-checked', 'false')); }
            picked[op.id] = !picked[op.id];
            b.setAttribute('aria-checked', String(!!picked[op.id]));
            C.Sound.tick();
          } }, h('span', { class: 'key' }, String.fromCharCode(65 + i)), h('span', { html: C.inline(op.text) }));
          box.appendChild(b);
        });
        answerUi.appendChild(box);
        if (q.format === 'multi') answerUi.appendChild(h('div', { class: 'under' }, 'Select every option that applies.'));
        getAnswer = () => { const ids = Object.keys(picked).filter(k => picked[k]); return q.format === 'choice' ? (ids[0] || null) : (ids.length ? ids : null); };
        lock = reveal => Array.from(box.children).forEach(c => {
          c.disabled = true;
          if (reveal) { const op = q.options.find(x => x.id === c.dataset.id); if (op.correct) c.classList.add('right'); else if (c.getAttribute('aria-checked') === 'true') c.classList.add('wrong'); else c.classList.add('dim'); }
        });
        this.ui.markWrong = shaker(box);
      } else if (q.format === 'order') {
        let seq = shuffle(q.items.map((_, i) => i));
        if (seq.every((v, i) => v === i)) seq.reverse();
        const box = h('div', { class: 'order', role: 'list' });
        const swap = (a, b) => { const t = seq[a]; seq[a] = seq[b]; seq[b] = t; C.Sound.tick(); draw(); };
        const draw = () => {
          box.innerHTML = '';
          seq.forEach((idx, pos) => box.appendChild(h('div', { class: 'order-item', role: 'listitem' }, h('span', { class: 'n' }, String(pos + 1)), h('span', { html: C.inline(q.items[idx]) }),
            h('span', { class: 'mv' },
              h('button', { 'aria-label': 'Move up', disabled: pos === 0, onclick: () => swap(pos - 1, pos) }, icon('up')),
              h('button', { 'aria-label': 'Move down', disabled: pos === seq.length - 1, onclick: () => swap(pos, pos + 1) }, icon('down'))))));
        };
        draw();
        answerUi.appendChild(box);
        answerUi.appendChild(h('div', { class: 'under' }, 'Use the arrows to put these in order, first at the top.'));
        getAnswer = () => seq.slice();
        lock = reveal => { if (reveal) { seq = q.items.map((_, i) => i); draw(); } box.querySelectorAll('button').forEach(b => { b.disabled = true; }); };
        this.ui.markWrong = shaker(box);
      } else if (q.format === 'bucket') {
        const placed = q.items.map(() => null);
        const box = h('div', { class: 'buckets' });
        shuffle(q.items.map((_, i) => i)).forEach(i => {
          const it = q.items[i];
          const pick = h('div', { class: 'pick', role: 'group', 'aria-label': 'Category' });
          q.buckets.forEach(b => pick.appendChild(h('button', { 'aria-pressed': 'false', data: { bucket: b.id }, onclick: ev => { placed[i] = b.id; Array.from(pick.children).forEach(c => c.setAttribute('aria-pressed', 'false')); ev.currentTarget.setAttribute('aria-pressed', 'true'); C.Sound.tick(); } }, b.label)));
          box.appendChild(h('div', { class: 'b-item', data: { i: String(i) } }, h('div', { class: 'txt', html: C.inline(it.text) }), pick));
        });
        answerUi.appendChild(box);
        getAnswer = () => (placed.every(p => p !== null) ? placed.slice() : null);
        lock = reveal => Array.from(box.children).forEach(c => {
          c.querySelectorAll('button').forEach(b => { b.disabled = true; });
          if (reveal) {
            const i = +c.dataset.i, it = q.items[i];
            c.classList.add(placed[i] === it.bucket ? 'right' : 'wrong');
            const lab = (q.buckets.find(b => b.id === it.bucket) || {}).label;
            c.appendChild(h('div', { class: 'why', html: '<strong>' + C.esc(lab) + '.</strong> ' + C.inline(it.why || '') }));
          }
        });
        this.ui.markWrong = shaker(box);
      } else {
        const area = h('textarea', { class: 'answer-box', id: 'answer-' + q.id, placeholder: q.type === 'teach' ? 'Explain it the way you would to someone new, in 150 words or fewer.' : 'Answer in your own words. A few sentences is enough.', 'aria-label': 'Your answer' });
        const count = h('span', { class: 'num' }, '0 words');
        area.addEventListener('input', () => { const n = area.value.trim() ? area.value.trim().split(/\s+/).length : 0; count.textContent = n + ' word' + (n === 1 ? '' : 's'); });
        const under = h('div', { class: 'under' }, count);
        if (C.Tutor.dict) {
          const mic = h('button', { class: 'icon-btn mic', 'aria-label': 'Dictate your answer', 'aria-pressed': 'false', title: 'Dictate', onclick: () => C.Tutor.dictate(area, mic) }, icon('mic'));
          under.insertBefore(mic, count);
        }
        under.appendChild(h('span', null, C.Tutor.canGrade() ? 'Claude grades this against a hidden rubric.' : 'Claude grading is not available here, so you will check your answer against the key points.'));
        answerUi.append(area, under);
        getAnswer = () => (area.value.trim().length >= 12 ? area.value.trim() : null);
        lock = () => { area.readOnly = true; };
        this.ui.area = area;
        this.ui.markWrong = shaker(area);
      }
      this.ui.lock = lock;

      // the confidence call rides on the submit, so calibration costs no extra tap
      const go = conf => {
        const a = getAnswer();
        if (a === null) { C.toast(q.format === 'text' ? 'Write an answer first.' : q.format === 'bucket' ? 'Place every item first.' : 'Pick an answer first.'); return; }
        onSubmit(a, conf);
      };
      submitRow.append(h('span', { class: 'how' }, 'Submit, and say how sure you are:'),
        h('button', { class: 'conf', data: { conf: 'sure' }, onclick: () => go('sure') }, 'Sure'),
        h('button', { class: 'conf', data: { conf: 'think' }, onclick: () => go('think') }, 'Think so'),
        h('button', { class: 'conf', data: { conf: 'guess' }, onclick: () => go('guess') }, 'Guessing'));

      const inLoop = o.mode !== 'placement' && o.mode !== 'final';
      const head = h('div', { class: 'qhead' },
        h('span', { class: 'chip line-' + sk.color }, sk.tag),
        h('span', { class: 'chip' }, TYPE[q.type] || q.type), dots(q.difficulty),
        o.label ? h('span', { class: 'chip warn' }, o.label) : null,
        h('span', { class: 'spacer' }),
        inLoop ? h('span', { class: 'chip', title: 'Your level at this stop' }, 'Level ' + eng.level(q.stop) + '/5') : null);

      const card = h('div', { class: 'card qcard build' });
      if (o.primer) card.appendChild(h('div', { class: 'note primer' }, h('span', { class: 'eyebrow' }, 'New material: ' + o.primer.name), h('div', { html: md(o.primer.primer) })));
      card.append(h('h2', null, q.title || ''), h('div', { class: 'prompt', html: md(q.prompt) }), answerUi, notes, submitRow);
      if (inLoop) {
        card.appendChild(h('div', { class: 'cmds' },
          h('button', { class: 'btn quiet small', onclick: () => app.go('progress') }, 'Show progress'),
          h('button', { class: 'btn quiet small', onclick: () => { eng.harder(); app.save(); C.toast('Harder: the next questions step up a level.'); } }, 'Harder'),
          h('button', { class: 'btn quiet small', onclick: () => { eng.easier(); app.save(); C.toast('Easier: the next questions step down a level.'); } }, 'Easier'),
          h('button', { class: 'btn quiet small', onclick: () => this.tell(true) }, 'Just tell me')));
      }

      const side = q.context ? h('div', { class: 'side' }, this.contextCard(q.context)) : null;
      root.appendChild(h('div', { class: 'learn' + (side ? '' : ' solo') }, h('div', null, head, card), side));
      if (o.primer) C.Tutor.speak(o.primer.primer);
      window.scrollTo({ top: 0, behavior: C.reduced() ? 'auto' : 'smooth' });
    },

    contextCard(c) {
      const card = h('div', { class: 'card ctx' }, h('div', { class: 'ctx-head' }, h('span', { class: 'chip' }, c.kind), h('span', null, c.label || '')));
      if (c.kind === 'chat' && Array.isArray(c.body)) {
        const box = h('div', { class: 'chatctx' });
        c.body.forEach(m => box.appendChild(h('div', { class: m.role === 'user' ? 'user' : 'assistant' }, m.text)));
        card.appendChild(box);
      } else card.appendChild(h('pre', { tabindex: '0' }, typeof c.body === 'string' ? c.body : JSON.stringify(c.body, null, 2)));
      return card;
    },

    note(kind, eyebrow, html, extra) {
      const n = h('div', { class: 'note ' + kind }, h('span', { class: 'eyebrow' }, eyebrow), h('div', { html: html }), extra || null);
      this.ui.notes.appendChild(n);
      return n;
    },

    async submit(answer, conf) {
      const c = this.cur, q = c.q;
      if (c.busy || c.resolved) return;
      c.conf = c.conf || conf;
      c.attempts += 1;
      let res;
      if (q.format === 'text') {
        if (!C.Tutor.canGrade()) return this.selfGrade();
        c.busy = true;
        const wait = this.note('push', 'Reading your answer', '<p>Claude is checking it against the rubric.</p>');
        const g = await C.Tutor.grade(q, answer, c.attempts);
        wait.remove(); c.busy = false;
        if (g.error) {
          c.attempts -= 1;
          if (!C.Tutor.canGrade()) return this.selfGrade();
          C.toast(g.error === 'rate_limited' ? 'Claude is busy. Give it a moment and submit again.' : 'The grader did not answer. Submit again.');
          return;
        }
        res = { ok: g.ok, probe: g.probe, note: g.note, got: g.got, need: g.need, trust: g.trust };
        if (q.type === 'teach') res.ok = g.ok && g.trust;
      } else {
        res = C.Grade[q.format](q, answer);
      }
      if (c.firstTry === null) c.firstTry = !!res.ok;
      if (res.ok) return this.correct(res);
      // a miss gets a narrower question, never the answer
      C.Sound.miss();
      if (this.ui.markWrong) this.ui.markWrong();
      if (c.attempts >= 3) return this.tell(false);
      const probe = res.probe || (q.probes || [])[c.attempts - 1] || (q.probes || [])[0] || 'Read the question again slowly. Which single step are you least sure of?';
      const bits = [];
      if (res.note) bits.push('<p class="' + SMALL + '">' + C.esc(res.note) + '</p>');
      if (res.hint) bits.push('<p class="' + SMALL + '">' + C.esc(res.hint) + '</p>');
      if (q.format === 'text' && res.need) bits.push('<p class="' + SMALL + '">' + res.got + ' of ' + res.need + ' key points so far.</p>');
      Array.from(this.ui.notes.querySelectorAll('.note.probe')).forEach(n => n.classList.add('dim'));
      const n = this.note('probe', 'Not yet. Attempt ' + c.attempts + ' of 3, a narrower question', '<p>' + C.inline(probe) + '</p>' + bits.join(''));
      if (C.Tutor.canGrade()) n.appendChild(this.talkBox(q, probe));
      C.Tutor.speak(probe);
      n.scrollIntoView({ block: 'nearest', behavior: C.reduced() ? 'auto' : 'smooth' });
    },

    talkBox(q, probe) {
      const thread = [];
      const box = h('div', { class: 'talk' });
      const input = h('input', { type: 'text', placeholder: 'Think out loud here, or revise your answer above.', 'aria-label': 'Reply to the narrower question', id: 'talk-' + q.id + '-' + this.cur.attempts });
      let busy = false;
      const send = async () => {
        const text = input.value.trim();
        if (!text || busy) return;
        busy = true; input.value = '';
        thread.push({ who: 'me', text: text });
        box.insertBefore(h('div', { class: 'msg me' }, text), row);
        const r = await C.Tutor.talk(q, probe, thread);
        busy = false;
        if (r.error) { box.insertBefore(h('div', { class: 'msg tutor' }, 'The tutor did not answer. Revise your answer above and submit.'), row); return; }
        thread.push({ who: 'tutor', text: r.text });
        box.insertBefore(h('div', { class: 'msg tutor' }, r.text), row);
        C.Tutor.speak(r.text);
        if (thread.length >= 8) row.remove();
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      const row = h('div', { class: 'talk-row' }, input, h('button', { class: 'btn small', onclick: send }, 'Reply'));
      box.appendChild(row);
      return box;
    },

    // The learner ticks the key points their answer made. Used when Claude grading is unavailable.
    checklist(must, onDone) {
      const ticks = must.map(() => false);
      const list = h('div', { class: 'opts', style: { marginTop: '10px' } });
      must.forEach((m, i) => {
        const b = h('button', { class: 'opt', role: 'checkbox', 'aria-checked': 'false', onclick: () => { ticks[i] = !ticks[i]; b.setAttribute('aria-checked', String(ticks[i])); } }, h('span', { class: 'key' }, icon('check')), h('span', { html: C.inline(m) }));
        list.appendChild(b);
      });
      return h('div', null, list, h('button', { class: 'btn primary small', onclick: () => onDone(ticks.filter(Boolean).length) }, 'Done checking'));
    },

    selfGrade() {
      const c = this.cur, q = c.q, r = q.rubric || { must: [] };
      const need = r.pass || r.must.length;
      this.ui.lock(false);
      this.ui.submitRow.hidden = true;
      const n = this.note('push', 'Check yourself', '<p>Tick each key point your answer clearly made. A vague mention does not count.</p>', this.checklist(r.must, got => {
        n.remove();
        c.selfGraded = true;
        if (c.firstTry === null) c.firstTry = got >= need;
        if (got >= need) this.correct({ ok: true, self: true }); else this.tell(false);
      }));
    },

    correct(res) {
      const c = this.cur, q = c.q;
      // a devil's advocate push on a clean first-try answer
      if (q.challenge && c.attempts === 1 && !c.challenged && !res.self) {
        c.challenged = true;
        this.ui.submitRow.hidden = true;
        this.ui.lock(false);
        const settle = stood => {
          n.remove();
          const held = q.challenge.hold !== false;
          c.pushed = stood === held ? 'held' : 'folded';
          const lead = (stood ? 'You stood by it. ' : 'You changed it. ') + (c.pushed === 'held' ? '' : (held ? 'The answer was right and worth defending. ' : 'The push pointed at a real exception. '));
          this.resolve(c.pushed === 'held' ? 'clean' : 'helped', '<p><strong>' + lead + '</strong>' + C.inline(q.challenge.why || '') + '</p>');
        };
        const n = this.note('push', 'Are you sure?', '<p>' + C.inline(q.challenge.prompt) + '</p>', h('div', { class: 'row', style: { marginTop: '10px' } },
          h('button', { class: 'btn small', onclick: () => settle(true) }, 'I stand by my answer'),
          h('button', { class: 'btn small', onclick: () => settle(false) }, 'I would change it')));
        C.Tutor.speak(q.challenge.prompt);
        return;
      }
      this.resolve(c.attempts === 1 && !res.self ? 'clean' : 'helped', res.note ? '<p class="muted">' + C.esc(res.note) + '</p>' : '');
    },

    tell(asked) {
      const c = this.cur;
      if (c.resolved || c.diag) return;
      if (c.firstTry === null) c.firstTry = false;
      c.asked = asked;
      this.resolve('told', '');
    },

    async resolve(out, extraHtml) {
      const app = C.app, eng = app.engine, c = this.cur, q = c.q;
      if (c.resolved) return;
      c.resolved = true;
      this.ui.lock(true);
      this.ui.submitRow.hidden = true;
      Array.from(this.ui.notes.querySelectorAll('.talk-row')).forEach(r => r.remove());
      const r = eng.record(q.id, { out: out, attempts: Math.max(1, c.attempts), conf: c.conf, firstTry: !!c.firstTry, mode: c.mode, cold: c.cold, teachPass: q.type === 'teach' && out !== 'told' });
      app.save();
      const ev = (q.evidence || []).length ? h('div', { class: 'evidence' }, q.evidence.map(e => h('code', null, e))) : null;
      const eyebrow = out === 'clean' ? 'Correct, first try' : out === 'helped' ? (c.selfGraded ? 'Correct, self-checked' : 'Correct, with a nudge') : (c.asked ? 'You asked for the answer' : 'Three misses, so here it is');
      this.note(out === 'told' ? 'told' : 'ok', eyebrow, extraHtml + md(q.answer || '') + (q.owner ? '<p class="so">' + C.inline(q.owner) + '</p>' : ''), ev);
      if (out === 'told') this.note('push', 'What happens next', '<p>This idea comes back right away from a different angle. It does not count toward a level until you get it without help.</p>');
      else C.Sound.ok();

      const gain = h('div', { class: 'gain' });
      if (r.xp) { gain.appendChild(h('span', { class: 'chip good' }, '+' + r.xp + ' xp')); C.fly('+' + r.xp, document.querySelector('.meter.xp') || this.ui.notes); }
      if (r.streak >= 3) gain.appendChild(h('span', { class: 'chip warn' }, r.streak + ' in a row, first try'));
      r.unlocked.forEach(card => gain.appendChild(h('button', { class: 'chip line-' + eng.stops[q.stop].color, onclick: () => app.go('cards') }, 'New card: ' + card.title)));
      if (r.unlocked.length) C.Sound.card();
      if (r.bar && !r.levelChange) {
        const b = r.bar;
        const bits = [b.have + ' of 2 right answers at difficulty ' + b.minD + '+' + (b.cleanOnly ? ', first try' : ''), b.cold ? 'unprompted answer done' : 'still needs one unprompted answer'];
        if (b.teach) bits.push(b.teachDone ? 'teach-back done' : 'then a teach-back');
        gain.appendChild(h('span', { class: 'bar-need' }, 'Toward level ' + b.level + ' (' + b.name + '): ' + bits.join(', ') + '.'));
      }
      this.ui.notes.appendChild(gain);

      const next = h('button', { class: 'btn primary', onclick: () => this.ask() }, 'Next question');
      this.ui.notes.appendChild(h('div', { class: 'row' }, next));
      app.meters();

      if (r.levelChange) {
        const sk = eng.stops[r.levelChange.stop];
        await C.levelUp({ name: sk.name, color: sk.color, from: r.levelChange.from, to: r.levelChange.to, down: r.levelChange.to < r.levelChange.from,
          note: r.demoted ? 'A surprise review went wrong, so this level has to be earned again.' : r.focusMoved ? 'Target reached. Next up: ' + eng.stops[r.focusMoved].name + '.' : r.rankChange ? 'New standing: ' + r.rankChange + '.' : '' });
      }
      if (r.lineMastered && !(eng.s.finals[r.lineMastered] || {}).pass) {
        const t = eng.lineById(r.lineMastered);
        this.note('primer', 'Every stop is at target', '<p>' + C.esc(t.name) + ' is ready for its final mixed assessment: one question per stop and one problem that ties them together, with no hints.</p>',
          h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn primary small', onclick: () => this.startFinal(t.id) }, 'Take the final')));
      }
      next.focus({ preventScroll: true });
    },

    // ── the final mixed assessment ──
    startFinal(lid) {
      const app = C.app;
      app.final = { line: lid, list: app.engine.buildFinal(lid), i: 0, results: [] };
      this.finalStep();
    },

    finalStep() {
      const app = C.app, eng = app.engine, f = app.final, root = this.root;
      if (f.i >= f.list.length) {
        const out = eng.recordFinal(f.line, f.results);
        app.final = null; app.save(); app.meters();
        const t = eng.lineById(f.line);
        const score = f.results.filter(r => r.ok).length;
        root.innerHTML = '';
        root.appendChild(solo(h('div', { class: 'card qcard build' },
          h('span', { class: 'eyebrow' }, 'Final: ' + t.name),
          h('h1', { class: 'page-title', style: { marginTop: '8px' } }, (out.pass ? 'Passed: ' : 'Not yet: ') + score + ' of ' + f.results.length + '.'),
          h('p', { class: 'page-sub' }, out.pass ? 'Every stop held up under mixed questions with no hints. Your weakest areas are listed below, so you know where to look first.' : 'A stop you missed has dropped a level. Earn it back with more questions, then take the final again.'),
          h('ul', null, out.weakest.map(w => h('li', null, eng.stops[w.stop].name + ': level ' + w.level + (w.told ? ', ' + w.told + ' answer' + (w.told === 1 ? '' : 's') + ' given away' : '')))),
          h('pre', { class: 'block', style: { margin: '14px 0' } }, eng.ascii()),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { if (out.pass) app.go('home'); else this.ask(); } }, out.pass ? 'Back to the map' : 'Back to the questions')))));
        if (out.pass) C.Sound.level();
        return;
      }
      const q = f.list[f.i];
      this.cur = { q: q, mode: 'final', attempts: 0 };
      const record = ok => { f.results.push({ q: q.id, ok: !!ok }); f.i += 1; C.Sound.tick(); this.finalStep(); };
      this.paint({ q: q, mode: 'final', label: 'Final ' + (f.i + 1) + ' of ' + f.list.length + (q.isFinal ? ', integrative' : '') }, async answer => {
        if (q.format !== 'text') return record(C.Grade[q.format](q, answer).ok);
        if (C.Tutor.canGrade()) {
          C.toast('Checking your answer.');
          const g = await C.Tutor.grade(q, answer, 1);
          if (g.error) { C.toast('The grader did not answer. Submit again.'); return; }
          return record(g.ok);
        }
        const r = q.rubric || { must: [] };
        this.ui.submitRow.hidden = true;
        this.ui.lock(false);
        this.note('push', 'Check yourself', '<p>Tick each criterion your answer clearly met.</p>', this.checklist(r.must, got => record(got >= (r.pass || r.must.length))));
      });
    },
  };

  C.Learn = Learn;
})();
