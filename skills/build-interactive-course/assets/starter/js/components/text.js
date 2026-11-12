/* `text`: a written answer. Grading goes down the written-answer path in learn.js: a self-check against
   the rubric's key points by default, or a check by the learner's own coding agent. This is also the
   fallback for any question whose component is missing or cannot use its data. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h;

  K.register('text', {
    empty: 'Write an answer first. A sentence or two is enough.',
    written: () => true,
    render(q, api) {
      const area = h('textarea', { class: 'answer-box', id: 'answer-' + q.id, placeholder: q.type === 'teach' ? 'Explain it the way you would to someone new, in 150 words or fewer.' : 'Answer in your own words. A few sentences is enough.', 'aria-label': 'Your answer' });
      const count = h('span', { class: 'num' }, '0 words');
      area.addEventListener('input', () => {
        const v = area.value.trim();
        const n = v ? v.split(/\s+/).length : 0;
        count.textContent = n + ' word' + (n === 1 ? '' : 's');
        // a few characters is not an answer yet
        api.ready(v.length >= 12 ? v : null);
      });
      api.el.append(area, h('div', { class: 'under' }, count, h('span', null, 'You check this against the key points yourself, or have your coding agent check it.')));
    },
    grade: () => ({ written: true }),
    autoAnswer(q, el, right) {
      const area = el.querySelector('textarea');
      area.value = right ? 'A full answer that covers each key point in my own words.' : 'Not sure at all, to be honest.';
      area.dispatchEvent(new Event('input'));
    },
  });
})();
