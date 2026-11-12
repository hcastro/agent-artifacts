/* `order`: three to seven steps, authored in the correct order and shown shuffled. The learner moves
   them with buttons, so it works by keyboard and on a phone without dragging. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h, icon = C.icon;

  K.register('order', {
    usable: q => Array.isArray(q.items) && q.items.length >= 2,
    render(q, api) {
      let seq = K.shuffle(q.items.map((_, i) => i));
      if (seq.every((v, i) => v === i)) seq.reverse();
      const box = h('div', { class: 'order', role: 'list' });
      const swap = (a, b) => { const t = seq[a]; seq[a] = seq[b]; seq[b] = t; C.Sound.tick(); draw(); api.ready(seq.slice()); };
      const draw = () => {
        box.innerHTML = '';
        seq.forEach((idx, pos) => box.appendChild(h('div', { class: 'order-item', role: 'listitem' }, h('span', { class: 'n' }, String(pos + 1)), h('span', { html: C.inline(q.items[idx]) }),
          h('span', { class: 'mv' },
            h('button', { 'aria-label': 'Move up', disabled: pos === 0, onclick: () => swap(pos - 1, pos) }, icon('up')),
            h('button', { 'aria-label': 'Move down', disabled: pos === seq.length - 1, onclick: () => swap(pos, pos + 1) }, icon('down'))))));
      };
      draw();
      api.el.append(box, h('div', { class: 'under' }, 'Use the arrows to put these in order, first at the top.'));
      api.el._order = { box: box, seq: () => seq.slice() };
      api.ready(seq.slice());
    },
    grade(q, seq) {
      const right = (q.items || []).filter((_, i) => seq[i] === i).length;
      return { ok: right === q.items.length, probe: null };
    },
    // Settled: the list shows the correct order, with no move buttons left to press.
    reveal(q, el) {
      const o = el._order;
      if (!o) return;
      o.box.innerHTML = '';
      q.items.forEach((t, i) => o.box.appendChild(h('div', { class: 'order-item settled', role: 'listitem' }, h('span', { class: 'n' }, String(i + 1)), h('span', { html: C.inline(t) }))));
    },
    async autoAnswer(q, el, right) {
      // bubble the shown order toward the correct one through the move buttons
      for (let moves = 0; right && moves < 60; moves++) {
        const seq = el._order.seq();
        const k = seq.findIndex((p, i) => i < seq.length - 1 && p > seq[i + 1]);
        if (k < 0) break;
        el.querySelectorAll('.order-item')[k].querySelector('button[aria-label="Move down"]').click();
      }
    },
  });
})();
