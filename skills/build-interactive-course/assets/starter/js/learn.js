/* Course question loop. One question at a time. A miss gets a narrower question, and the answer shows only
   after three misses or when the learner asks. Levels move only on the engine's evidence rules.
   Each question's input comes from its component (components.js). Everything else lives here, so probes,
   attempts, confidence, re-tests, challenges and the teach-back work the same for every format. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});
  const h = C.h, md = C.md, K = C.components;
  const TYPE = { predict: 'predict the outcome', explain: 'explain why', flaw: 'find the flaw', apply: 'apply it', connect: 'connect two ideas', teach: 'teach it back' };
  const SMALL = 'muted small-note';

  // the dots carry a visible word so difficulty does not depend on reading a pattern
  function dots(d) {
    const s = h('span', { class: 'dots', 'aria-hidden': 'true' });
    for (let i = 1; i <= 5; i++) s.appendChild(h('i', { class: i <= d ? 'on' : '' }));
    return h('span', { class: 'diff', title: 'Difficulty ' + d + ' of 5', 'aria-label': 'Difficulty ' + d + ' of 5' }, h('span', null, 'Difficulty'), s);
  }
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
        const lv = eng.s.offer.levels;
        root.appendChild(solo(h('div', { class: 'card qcard build' },
          h('span', { class: 'eyebrow' }, line.name),
          h('h1', { class: 'page-title', style: { marginTop: '8px' } }, 'Pick up where your last session stopped.'),
          h('p', { class: 'page-sub' }, 'The progress you loaded sets starting levels on this line: ' + Object.keys(lv).filter(k => eng.stops[k]).map(k => eng.stops[k].tag + ' ' + Math.min(3, lv[k])).join(', ') + '. They come from an earlier session, which is why the map shows levels before you have answered anything here. Each one was reached with help, so the question you left open comes first and earlier mistakes come back without warning.'),
          h('div', { class: 'row' },
            h('button', { class: 'btn', onclick: () => { const map = eng.applyResume(); app.save(); this.placed(lid, map); } }, 'Resume from that session'),
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
        const g = K.get(q).grade(q, answer);
        results.push({ q: q.id, ok: !!g.ok, conf: conf });
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

    // Asks one question by id, outside the engine's choice. The learner test uses it to reach every
    // format, and an author can run Course.Learn.askById('<id>') in the console to look at one question.
    askById(id) {
      const app = C.app, q = app.engine.byId[id];
      if (!q || !this.root) return false;
      app.final = null;
      this.cur = { q: q, mode: 'focus', cold: false, attempts: 0, firstTry: null };
      this.paint({ q: q, mode: 'focus', label: null }, (answer, conf) => this.submit(answer, conf));
      return true;
    },

    // Answers the current question through its component's autoAnswer hook. Used by the learner test.
    async autoAnswer(right) {
      const comp = this.ui && this.ui.comp;
      if (!comp) return 'no question on screen';
      if (typeof comp.autoAnswer !== 'function') return 'component ' + comp.name + ' has no autoAnswer hook';
      await comp.autoAnswer(this.cur.q, this.ui.answerUi, !!right);
      return 'ok';
    },

    // What every component gets: the element to draw in, the ready callback and a few helpers.
    api(q, el, mode, onReady) {
      return { el: el, q: q, mode: mode, ready: a => onReady(a === undefined ? null : a), h: h, md: md, inline: C.inline, icon: C.icon, block: K.block, options: K.options, tick: () => C.Sound.tick() };
    },

    paint(o, onSubmit) {
      const app = C.app, eng = app.engine, root = this.root, q = o.q, sk = eng.stops[q.stop];
      root.innerHTML = '';
      const comp = K.get(q);
      const notes = h('div', { 'aria-live': 'polite' });
      const answerUi = h('div', { class: 'answer-ui fmt-' + comp.name });
      const submitRow = h('div', { class: 'submit' });
      let current = null;
      this.ui = { comp: comp, notes: notes, answerUi: answerUi, submitRow: submitRow, answers: [], frozen: [] };
      comp.render(q, this.api(q, answerUi, o.mode, a => { current = a; }));
      this.ui.markWrong = () => { answerUi.classList.remove('shake'); void answerUi.offsetWidth; answerUi.classList.add('shake'); };

      // the confidence call rides on the submit, so calibration costs no extra tap
      const go = conf => {
        if (current === null) { C.toast(comp.empty || 'Pick an answer first.'); return; }
        onSubmit(current, conf);
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
      // a component that cannot use this question's data hands it to the written answer
      const fallback = comp.name !== q.format ? h('p', { class: 'cmp-note' }, 'This question could not show its usual controls, so answer it in your own words.') : null;
      // native append writes null as text, so leave the missing note out
      card.append(...[h('h2', null, q.title || ''), h('div', { class: 'prompt', html: md(q.prompt) }), fallback, answerUi, notes, submitRow].filter(Boolean));
      if (inLoop) {
        card.appendChild(h('div', { class: 'cmds' },
          h('button', { class: 'btn quiet small', onclick: () => app.go('progress') }, 'Show progress'),
          h('button', { class: 'btn quiet small', onclick: () => { eng.harder(); app.save(); C.toast('Harder: the next questions step up a level.'); } }, 'Harder'),
          h('button', { class: 'btn quiet small', onclick: () => { eng.easier(); app.save(); C.toast('Easier: the next questions step down a level.'); } }, 'Easier'),
          h('button', { class: 'btn quiet small', onclick: () => this.tell(true) }, 'Just tell me')));
      }

      const side = q.context ? h('div', { class: 'side' }, K.block(q.context)) : null;
      root.appendChild(h('div', { class: 'learn' + (side ? '' : ' solo') }, h('div', null, head, card), side));
      if (o.primer) C.Tutor.speak(o.primer.primer);
      window.scrollTo({ top: 0, behavior: C.reduced() ? 'auto' : 'smooth' });
    },

    // Stops input while a written answer is checked or once the question settles. unfreeze() undoes
    // it for a retry, and re-enables only what freeze() disabled.
    freeze() {
      const el = this.ui.answerUi;
      el.classList.add('frozen');
      const live = Array.from(el.querySelectorAll('button, input, textarea, select')).filter(x => !x.disabled);
      live.forEach(x => { x.disabled = true; });
      this.ui.frozen = this.ui.frozen.concat(live);
    },
    unfreeze() {
      this.ui.answerUi.classList.remove('frozen');
      this.ui.frozen.forEach(x => { x.disabled = false; });
      this.ui.frozen = [];
    },

    note(kind, eyebrow, html, extra) {
      const n = h('div', { class: 'note ' + kind }, h('span', { class: 'eyebrow' }, eyebrow), h('div', { html: html }), extra || null);
      this.ui.notes.appendChild(n);
      return n;
    },

    submit(answer, conf) {
      const c = this.cur, q = c.q, comp = this.ui.comp;
      if (c.resolved || c.checking) return;
      c.conf = c.conf || conf;
      this.ui.answers.push(answer);
      const res = comp.grade(q, answer) || { ok: false };
      if (res.written) { c.attempts += 1; return this.checkWritten(answer); }
      if (res.next) {
        // a right call inside a multi-step question: no attempt is used, and the question stays open
        Array.from(this.ui.notes.querySelectorAll('.note.probe')).forEach(n => n.remove());
        C.Sound.ok();
        if (comp.update) comp.update(q, this.ui.answerUi, res);
        return;
      }
      c.attempts += 1;
      if (c.firstTry === null) c.firstTry = !!res.ok;
      if (res.ok) return this.correct(res);
      this.miss(res);
    },

    // a miss gets a narrower question, never the answer
    miss(res) {
      const c = this.cur, q = c.q;
      C.Sound.miss();
      this.ui.markWrong();
      if (c.attempts >= 3) return this.tell(false);
      const generic = (q.probes || [])[c.attempts - 1] || (q.probes || [])[0] || 'Read the question again slowly. Which single step are you least sure of?';
      const probe = res.probe || generic;
      const bits = [];
      if (res.agent) bits.push('<p class="' + SMALL + '">Answer the narrower question your agent asked, then revise your answer and submit again. If it did not ask one, use the question above.</p>');
      if (res.hint) bits.push('<p class="' + SMALL + '">' + C.esc(res.hint) + '</p>');
      Array.from(this.ui.notes.querySelectorAll('.note.probe')).forEach(n => n.classList.add('dim'));
      const n = this.note('probe', 'Not yet. Attempt ' + c.attempts + ' of 3, a narrower question', '<p>' + C.inline(probe) + '</p>' + bits.join(''));
      if (this.ui.comp.update) this.ui.comp.update(q, this.ui.answerUi, res);
      C.Tutor.speak(probe);
      n.scrollIntoView({ block: 'nearest', behavior: C.reduced() ? 'auto' : 'smooth' });
    },

    // The learner ticks the key points their answer made.
    checklist(must, onDone) {
      const ticks = must.map(() => false);
      const list = h('div', { class: 'opts checklist', style: { marginTop: '10px' } });
      must.forEach((m, i) => {
        const b = h('button', { class: 'opt', role: 'checkbox', 'aria-checked': 'false', onclick: () => { ticks[i] = !ticks[i]; b.setAttribute('aria-checked', String(ticks[i])); } }, h('span', { class: 'key' }, C.icon('check')), h('span', { html: C.inline(m) }));
        list.appendChild(b);
      });
      return h('div', null, list, h('button', { class: 'btn primary small', onclick: () => onDone(ticks.filter(Boolean).length) }, 'Done checking'));
    },

    // A written answer is checked by the learner against the key points, or by their own coding agent
    // from a prompt the page copies. `done` gets { via: 'self' or 'agent', ok }.
    writtenCheck(q, answer, attempt, done) {
      const r = K.rubric(q), need = r.pass || r.must.length;
      const body = h('div');
      const n = this.note('push check-written', 'Check your answer', '', body);
      const self = () => {
        body.innerHTML = '';
        body.append(h('p', null, 'Tick each key point your answer clearly made. A vague mention does not count.'),
          this.checklist(r.must, got => done({ via: 'self', ok: got >= need })),
          h('p', { class: 'alt' }, h('span', { class: 'muted' }, 'Or have your coding agent check it. '), h('button', { class: 'btn quiet small', onclick: agent }, 'Check with my agent')));
      };
      const agent = () => {
        const prompt = C.Tutor.agentPrompt(q, answer, attempt);
        body.innerHTML = '';
        const status = h('p', null, 'Copying the prompt.');
        const ta = h('textarea', { class: 'block agent-prompt', readonly: true, 'aria-label': 'Prompt for your coding agent' });
        ta.value = prompt;
        const det = h('details', { class: 'agent-details' }, h('summary', null, 'Show the prompt'), ta);
        C.copyText(prompt).then(ok => {
          status.textContent = ok ? 'The prompt is on your clipboard. Paste it into a chat with your coding agent, then come back and say what it told you.'
            : 'Copying was blocked, so copy the prompt below yourself. Paste it into a chat with your coding agent, then come back and say what it told you.';
          if (!ok) det.open = true;
        });
        body.append(status, det,
          h('p', { class: SMALL }, 'The prompt lists the key points, so skip reading it if you want a clean check.'),
          h('p', { class: 'ask-agent' }, h('strong', null, 'What did your agent say?')),
          h('div', { class: 'row' },
            h('button', { class: 'btn small', onclick: () => done({ via: 'agent', ok: true }) }, 'Got it'),
            h('button', { class: 'btn small', onclick: () => done({ via: 'agent', ok: false }) }, 'Not yet')),
          h('p', { class: 'alt' }, h('button', { class: 'btn quiet small', onclick: self }, 'Check it myself instead')));
      };
      self();
      return n;
    },

    checkWritten(answer) {
      const c = this.cur, q = c.q;
      c.checking = true;
      this.freeze();
      this.ui.submitRow.hidden = true;
      const n = this.writtenCheck(q, answer, c.attempts, v => {
        n.remove();
        c.checking = false;
        if (c.firstTry === null) c.firstTry = v.ok;
        if (v.via === 'self') {
          c.selfGraded = true;
          return v.ok ? this.correct({ ok: true, self: true }) : this.tell(false);
        }
        // the agent's verdict: a pass on the first attempt counts as a first-try pass
        if (v.ok) return this.correct({ ok: true, agent: true });
        this.unfreeze();
        this.ui.submitRow.hidden = false;
        this.miss({ agent: true });
      });
    },

    correct(res) {
      const c = this.cur, q = c.q;
      // a devil's advocate push on a clean first-try answer
      if (q.challenge && c.attempts === 1 && !c.challenged && !res.self) {
        c.challenged = true;
        this.ui.submitRow.hidden = true;
        this.freeze();
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
      this.resolve(c.attempts === 1 && !res.self ? 'clean' : 'helped', '');
    },

    tell(asked) {
      const c = this.cur;
      if (c.resolved || c.diag) return;
      if (c.firstTry === null) c.firstTry = false;
      c.asked = asked;
      const open = this.ui.notes.querySelector('.check-written');
      if (open) open.remove();
      this.resolve('told', '');
    },

    async resolve(out, extraHtml) {
      const app = C.app, eng = app.engine, c = this.cur, q = c.q, comp = this.ui.comp;
      if (c.resolved) return;
      c.resolved = true;
      this.freeze();
      this.ui.submitRow.hidden = true;
      const answers = this.ui.answers;
      if (comp.reveal) comp.reveal(q, this.ui.answerUi, { out: out, answer: answers[answers.length - 1], answers: answers.slice() });
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
      this.paint({ q: q, mode: 'final', label: 'Final ' + (f.i + 1) + ' of ' + f.list.length + (q.isFinal ? ', integrative' : '') }, answer => {
        const comp = this.ui.comp;
        this.ui.answers.push(answer);
        const g = comp.grade(q, answer) || {};
        if (g.next) { if (comp.update) comp.update(q, this.ui.answerUi, g); return; }
        if (!g.written) return record(g.ok);
        // no hints in a final, so a written answer gets one check
        this.freeze();
        this.ui.submitRow.hidden = true;
        this.writtenCheck(q, answer, 1, v => record(v.ok));
      });
    },
  };

  C.Learn = Learn;
})();
