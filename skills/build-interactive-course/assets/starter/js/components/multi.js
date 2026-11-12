/* `multi`: two or more correct options among four to six, graded all or nothing. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h;

  K.register('multi', {
    empty: 'Pick at least one option first.',
    usable: q => Array.isArray(q.options) && q.options.length >= 2,
    render(q, api) {
      const list = K.options(q.options, { multi: true, onChange: v => api.ready(v) });
      api.el._choice = list;
      api.el.append(list.el, h('div', { class: 'under' }, 'Select every option that applies.'));
    },
    grade(q, picked) {
      const set = {};
      (picked || []).forEach(id => { set[id] = true; });
      let probe = null, ok = true;
      (q.options || []).forEach(o => {
        const chosen = !!set[o.id];
        if (chosen !== !!o.correct) { ok = false; if (!probe && chosen && o.probe) probe = o.probe; }
      });
      // nothing wrong was picked, so point at a right option the learner left out
      if (!ok && !probe) {
        const missed = (q.options || []).find(o => o.correct && !set[o.id] && o.probe);
        probe = missed ? missed.probe : null;
      }
      return { ok: ok, probe: probe };
    },
    reveal(q, el) { if (el._choice) el._choice.mark(); },
    autoAnswer(q, el, right) { K.setOptions(el, K.pickIds(q.options, right, true)); },
  });
})();
