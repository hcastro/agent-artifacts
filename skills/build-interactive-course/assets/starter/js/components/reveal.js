/* `reveal`: predict, then reveal. A block has a part the learner sees and a part kept back, such as a
   command and its output, or a diff and its test result. The learner commits to an answer, by option or
   in writing, and the kept-back part appears only once the question is settled. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h, icon = C.icon;
  const hasOptions = q => Array.isArray(q.options) && q.options.length >= 2;

  K.register('reveal', {
    empty: 'Commit to an answer first.',
    usable: q => !!(q.block && q.block.shown && q.block.hidden && (hasOptions(q) || q.rubric)),
    written: q => !hasOptions(q),
    render(q, api) {
      const b = q.block;
      // The kept-back text is not in the page until the reveal, so it cannot be read early by accident.
      const later = h('div', { class: 'rv-later' }, h('div', { class: 'rv-label' }, b.hidden_label || 'What happened'),
        h('p', { class: 'rv-lock' }, icon('lock'), 'This part opens once you commit to an answer.'));
      const body = h('div', null, h('pre', { tabindex: '0' }, b.shown), later);
      const answer = h('div', { class: 'rv-answer' });
      api.el.append(K.block(b, body), answer);
      api.el._reveal = { later: later, answer: answer };
      // the answer itself is a choice or a written answer, drawn by that component
      const inner = K.raw(hasOptions(q) ? 'choice' : 'text');
      inner.render(q, Object.assign({}, api, { el: answer }));
    },
    grade: (q, a) => (hasOptions(q) ? K.gradeChoice(q.options, a) : { written: true }),
    reveal(q, el, result) {
      const r = el._reveal;
      if (!r) return;
      r.later.innerHTML = '';
      r.later.classList.add('open');
      r.later.append(h('div', { class: 'rv-label' }, q.block.hidden_label || 'What happened'), h('pre', { tabindex: '0' }, q.block.hidden));
      if (hasOptions(q)) K.raw('choice').reveal(q, r.answer, result);
    },
    autoAnswer(q, el, right) { return K.raw(hasOptions(q) ? 'choice' : 'text').autoAnswer(q, el._reveal.answer, right); },
  });
})();
