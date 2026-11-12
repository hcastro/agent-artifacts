/* Question components. Each question format is a component: it draws its own input, grades a closed
   answer and shows what it needs to once the question settles. The learn loop owns everything else, so
   probes, attempts, confidence, re-tests, challenges, the teach-back and levels work the same for all.

     Course.components.register('name', {
       render(q, api)          draw the input inside api.el, then call api.ready(answer), or api.ready(null)
                               while nothing can be submitted yet
       grade(q, answer)        return { ok, probe, hint } for a closed answer, { written: true } to send the
                               answer to the written-answer path, or { next: true } when the answer was right
                               and the component has another call to ask for in the same question
       reveal(q, el, result)   optional: what to show once the question is settled. result holds `out`
                               ('clean', 'helped' or 'told'), `answer` (the last one) and `answers` (all)
       update(q, el, result)   optional: called after a graded attempt that leaves the question open
       written(q)              optional: true when this question is answered in writing
       usable(q)               optional: false when the data is missing, so the question falls back to text
       autoAnswer(q, el, right) answers through the component's own controls. The learner test needs it.
       empty                   optional: the message when the learner submits with nothing ready
     })

   The guide for writing a new one is references/components.md in the skill. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});
  const registry = {};

  function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = r[i]; r[i] = r[j]; r[j] = t; } return r; }

  // Without a rubric, a fallback written answer is checked against the reference answer as a whole.
  const FALLBACK_RUBRIC = { must: ['My answer reaches the same conclusion as the reference answer, for the same reason.'], pass: 1 };

  const components = {
    register(name, def) {
      if (!def || typeof def.render !== 'function' || typeof def.grade !== 'function') throw new Error('Component ' + name + ' needs render and grade.');
      registry[name] = Object.assign({ name: name }, def);
      return registry[name];
    },
    has(name) { return !!registry[name]; },
    names() { return Object.keys(registry); },
    raw(name) { return registry[name] || null; },
    // A question whose component is missing, or whose data its component cannot use, is asked as text.
    get(q) {
      const c = registry[q.format];
      if (c && (!c.usable || c.usable(q))) return c;
      return registry.text;
    },
    written(q) {
      const c = components.get(q);
      return c === registry.text || !!(c.written && c.written(q));
    },
    rubric(q) { return q.rubric && (q.rubric.must || []).length ? q.rubric : FALLBACK_RUBRIC; },
    shuffle: shuffle,

    // A list of answer options in a shuffled order, shared by every format that offers options.
    // Keeps the `.opts .opt` classes, which the A to F keyboard shortcut in main.js looks for.
    options(list, opts) {
      const h = C.h, multi = !!(opts && opts.multi);
      const picked = {};
      const box = h('div', { class: 'opts', role: multi ? 'group' : 'radiogroup', 'aria-label': (opts && opts.label) || 'Answer options' });
      const value = () => { const ids = Object.keys(picked).filter(k => picked[k]); return multi ? (ids.length ? ids.sort() : null) : (ids[0] || null); };
      // shuffled so the correct option has no favored position
      shuffle(list).forEach((op, i) => {
        const b = h('button', { class: 'opt', role: multi ? 'checkbox' : 'radio', 'aria-checked': 'false', data: { id: op.id }, onclick: () => {
          if (!multi) { Object.keys(picked).forEach(k => delete picked[k]); Array.from(box.children).forEach(c => c.setAttribute('aria-checked', 'false')); }
          picked[op.id] = !picked[op.id];
          b.setAttribute('aria-checked', String(!!picked[op.id]));
          C.Sound.tick();
          if (opts && opts.onChange) opts.onChange(value());
        } }, h('span', { class: 'key' }, String.fromCharCode(65 + i)), h('span', { html: C.inline(op.text) }));
        box.appendChild(b);
      });
      return {
        el: box,
        value: value,
        mark() {
          Array.from(box.children).forEach(c => {
            const op = list.find(x => x.id === c.dataset.id);
            if (op.correct) c.classList.add('right'); else if (c.getAttribute('aria-checked') === 'true') c.classList.add('wrong'); else c.classList.add('dim');
          });
        },
      };
    },

    // Clicks options in `box` until exactly the ids in `want` are checked, through the real buttons.
    setOptions(box, want) {
      Array.from(box.querySelectorAll('.opt')).forEach(b => {
        const on = b.getAttribute('aria-checked') === 'true';
        if (on !== want.indexOf(b.dataset.id) >= 0) b.click();
      });
    },
    // The ids a right or a wrong answer would pick, for autoAnswer hooks.
    pickIds(options, right, multi) {
      if (right) return options.filter(o => o.correct).map(o => o.id);
      if (!multi) return [options.find(o => !o.correct).id];
      return options.filter(o => !o.correct).map(o => o.id);
    },

    gradeChoice(options, picked) {
      const opt = (options || []).find(o => o.id === picked);
      const ok = !!(opt && opt.correct);
      return { ok: ok, probe: ok ? null : (opt && opt.probe) || null };
    },

    // A block of code, config, log, JSON, a table or a chat, with a small heading.
    block(c, body) {
      const h = C.h;
      const card = h('div', { class: 'card ctx' }, h('div', { class: 'ctx-head' }, h('span', { class: 'chip' }, c.kind || 'note'), h('span', null, c.label || '')));
      if (body) card.appendChild(body);
      else if (c.kind === 'chat' && Array.isArray(c.body)) {
        const box = h('div', { class: 'chatctx' });
        c.body.forEach(m => box.appendChild(h('div', { class: m.role === 'user' ? 'user' : 'assistant' }, m.text)));
        card.appendChild(box);
      } else card.appendChild(h('pre', { tabindex: '0' }, typeof c.body === 'string' ? c.body : JSON.stringify(c.body, null, 2)));
      return card;
    },
  };

  C.components = components;
})();
