/* `bucket`: sort four to eight items into two to six groups. A miss says how many are in place. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h;

  K.register('bucket', {
    empty: 'Place every item first.',
    usable: q => Array.isArray(q.items) && q.items.length && Array.isArray(q.buckets) && q.buckets.length >= 2,
    render(q, api) {
      const placed = q.items.map(() => null);
      const box = h('div', { class: 'buckets' });
      K.shuffle(q.items.map((_, i) => i)).forEach(i => {
        const it = q.items[i];
        const pick = h('div', { class: 'pick', role: 'group', 'aria-label': 'Group for this item' });
        q.buckets.forEach(b => pick.appendChild(h('button', { 'aria-pressed': 'false', data: { bucket: b.id }, onclick: ev => {
          placed[i] = b.id;
          Array.from(pick.children).forEach(c => c.setAttribute('aria-pressed', 'false'));
          ev.currentTarget.setAttribute('aria-pressed', 'true');
          C.Sound.tick();
          api.ready(placed.every(p => p !== null) ? placed.slice() : null);
        } }, b.label)));
        box.appendChild(h('div', { class: 'b-item', data: { i: String(i) } }, h('div', { class: 'txt', html: C.inline(it.text) }), pick));
      });
      api.el._bucket = placed;
      api.el.appendChild(box);
    },
    grade(q, placed) {
      const items = q.items || [];
      const right = items.filter((it, i) => placed[i] === it.bucket).length;
      return { ok: right === items.length, probe: null, hint: right + ' of ' + items.length + ' are in the right place.' };
    },
    reveal(q, el) {
      const placed = el._bucket || [];
      el.querySelectorAll('.b-item').forEach(c => {
        const i = +c.dataset.i, it = q.items[i];
        c.classList.add(placed[i] === it.bucket ? 'right' : 'wrong');
        const lab = (q.buckets.find(b => b.id === it.bucket) || {}).label;
        c.appendChild(h('div', { class: 'why', html: '<strong>' + C.esc(lab) + '.</strong> ' + C.inline(it.why || '') }));
      });
    },
    autoAnswer(q, el, right) {
      el.querySelectorAll('.b-item').forEach(row => {
        const it = q.items[+row.dataset.i];
        const b = right ? it.bucket : q.buckets.find(x => x.id !== it.bucket).id;
        row.querySelector('button[data-bucket="' + b + '"]').click();
      });
    },
  });
})();
