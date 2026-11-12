/* `choice`: one correct option among three to six. Each wrong option carries its own narrower question. */
(function () {
  'use strict';
  const C = window.Course, K = C.components;

  K.register('choice', {
    empty: 'Pick an answer first.',
    usable: q => Array.isArray(q.options) && q.options.length >= 2,
    render(q, api) {
      const list = K.options(q.options, { onChange: v => api.ready(v) });
      api.el._choice = list;
      api.el.appendChild(list.el);
    },
    grade: (q, picked) => K.gradeChoice(q.options, picked),
    reveal(q, el) { if (el._choice) el._choice.mark(); },
    autoAnswer(q, el, right) { K.setOptions(el, K.pickIds(q.options, right, false)); },
  });
})();
