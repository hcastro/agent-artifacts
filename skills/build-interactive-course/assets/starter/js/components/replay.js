/* `replay`: step through a recorded sequence, such as a trace, an incident or a shift. A step marked with
   `pause` is held back. When the replay reaches it, the learner calls what happens next from options,
   and the step plays only once that call is right or the question is settled. Each call goes through the
   normal submit, so a wrong call gets the loop's narrower question like any other miss. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h;
  const isPause = s => !!(s && s.pause && Array.isArray(s.pause.options) && s.pause.options.length >= 2);
  const plain = t => String(t || '').replace(/`|\*\*/g, '');
  const rightText = s => plain(s.pause.options.find(o => o.correct).text);

  K.register('replay', {
    empty: 'Play the replay to the next pause and make your call first.',
    usable: q => Array.isArray(q.steps) && q.steps.length >= 2 && q.steps.some(isPause),
    render(q, api) {
      const steps = q.steps;
      const st = { shown: 0, asking: -1, calls: {}, list: null };
      const x = i => (steps.length < 2 ? 0 : i / (steps.length - 1));

      // the timeline: one dot per step, a ring for each pause, and a marker at the current step
      const track = h('div', { class: 'rp-track', role: 'img' });
      const dots = steps.map((s, i) => {
        const d = h('span', { class: 'rp-dot' + (isPause(s) ? ' pause' : '') });
        d.style.setProperty('--x', x(i));
        track.appendChild(d);
        return d;
      });
      const marker = h('span', { class: 'rp-marker', 'aria-hidden': 'true' });
      track.appendChild(marker);
      const pos = h('div', { class: 'rp-pos num' });
      const log = h('ol', { class: 'rp-steps' });
      const ask = h('div', { class: 'rp-ask', 'aria-live': 'polite' });
      const nextBtn = h('button', { class: 'btn small rp-next', onclick: () => advance() }, 'Next step');
      api.el.append(h('div', { class: 'rp-head' }, h('span', { class: 'eyebrow' }, 'Replay'), pos), track, log, ask, h('div', { class: 'row rp-controls' }, nextBtn));

      const draw = () => {
        const at = Math.max(0, st.asking >= 0 ? st.asking : st.shown - 1);
        marker.style.setProperty('--x', x(at));
        dots.forEach((d, i) => { d.classList.toggle('done', i < st.shown); d.classList.toggle('here', i === at); });
        const s = steps[at];
        const where = 'Step ' + (at + 1) + ' of ' + steps.length + (s && s.time ? ', ' + s.time : '');
        pos.textContent = where;
        track.setAttribute('aria-label', 'Timeline. ' + where + '.');
        nextBtn.hidden = st.asking >= 0 || st.shown >= steps.length;
      };
      const row = (s, i) => {
        const call = st.calls[i];
        return h('li', { class: 'rp-step' + (isPause(s) ? ' was-pause' : '') },
          h('span', { class: 't num' }, s.time || String(i + 1)),
          h('div', null, h('div', { class: 'lb', html: C.inline(s.label || '') }), s.detail ? h('div', { class: 'dt', html: C.md(s.detail) }) : null,
            call ? h('div', { class: 'rp-call ' + call.kind }, call.text) : null));
      };
      const show = i => { log.appendChild(row(steps[i], i)); st.shown = i + 1; };
      const openAsk = i => {
        st.asking = i;
        const p = steps[i].pause;
        st.list = K.options(p.options, { label: 'Your call', onChange: v => api.ready(v ? { step: i, pick: v } : null) });
        ask.innerHTML = '';
        ask.append(h('span', { class: 'eyebrow' }, 'Your call'), h('p', { class: 'rp-q', html: C.inline(p.prompt || 'What happens next?') }), st.list.el);
        api.ready(null);
      };
      // plays forward until the end or the next pause that has no call yet
      const advance = () => {
        if (st.asking >= 0 || st.shown >= steps.length) return;
        if (isPause(steps[st.shown]) && !st.calls[st.shown]) openAsk(st.shown);
        else { show(st.shown); C.Sound.tick(); }
        draw();
      };
      api.el._replay = {
        st: st,
        advance: advance,
        // a right call: record it, play the step it predicted and carry on to the next pause
        commit() {
          const i = st.asking;
          st.calls[i] = { kind: 'right', text: 'Your call: ' + rightText(steps[i]) };
          st.asking = -1; ask.innerHTML = '';
          show(i); draw();
          nextBtn.focus({ preventScroll: true });
        },
        // settled: play every step that is left and say what each held-back call was
        finish(told) {
          if (st.asking >= 0) {
            st.calls[st.asking] = { kind: told ? 'told' : 'right', text: (told ? 'The call was: ' : 'Your call: ') + rightText(steps[st.asking]) };
            st.asking = -1; ask.innerHTML = '';
          }
          while (st.shown < steps.length) {
            const s = steps[st.shown];
            if (isPause(s) && !st.calls[st.shown]) st.calls[st.shown] = { kind: 'told', text: 'The call was: ' + rightText(s) };
            show(st.shown);
          }
          draw();
        },
      };
      advance();
    },
    grade(q, a) {
      const s = q.steps[a.step];
      const opt = s.pause.options.find(o => o.id === a.pick);
      if (!opt || !opt.correct) return { ok: false, probe: (opt && opt.probe) || null };
      return q.steps.some((x, i) => i > a.step && isPause(x)) ? { next: true } : { ok: true };
    },
    update(q, el, res) { if (res.next && el._replay) el._replay.commit(); },
    reveal(q, el, result) { if (el._replay) el._replay.finish(result.out === 'told'); },
    autoAnswer(q, el, right) {
      const r = el._replay;
      for (let k = 0; k < q.steps.length + 1 && r.st.asking < 0; k++) r.advance();
      if (r.st.asking < 0) return;
      const opts = q.steps[r.st.asking].pause.options;
      K.setOptions(el.querySelector('.rp-ask'), K.pickIds(opts, right, false));
    },
  });
})();
