/* `spot`: the learner marks the line or lines in a code, config or log block that are wrong, or that
   prove a claim. Graded on the exact set of line numbers. The block is a multi-select list box, so it
   works with the arrow keys and Space as well as by pointer. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h;

  K.register('spot', {
    empty: 'Mark at least one line first.',
    usable: q => !!(q.block && typeof q.block.body === 'string' && Array.isArray(q.lines) && q.lines.length),
    render(q, api) {
      const lines = q.block.body.split('\n');
      const sel = new Set();
      let active = 0;
      const box = h('div', { class: 'spot-lines', role: 'listbox', 'aria-multiselectable': 'true', tabindex: '0',
        'aria-label': (q.block.label || 'Lines') + '. Use the arrow keys to move and Space to mark a line.' });
      const rows = lines.map((t, i) => {
        const r = h('div', { class: 'spot-line', role: 'option', id: 'spot-' + q.id + '-' + (i + 1), 'aria-selected': 'false', data: { n: String(i + 1) },
          onclick: () => { active = i; toggle(i); focusRow(); } },
          h('span', { class: 'ln', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'tx' }, t || ' '));
        box.appendChild(r);
        return r;
      });
      const frozen = () => api.el.classList.contains('frozen');
      const toggle = i => {
        if (frozen()) return;
        const n = i + 1;
        if (sel.has(n)) sel.delete(n); else sel.add(n);
        rows[i].setAttribute('aria-selected', String(sel.has(n)));
        C.Sound.tick();
        api.ready(sel.size ? Array.from(sel).sort((a, b) => a - b) : null);
      };
      const focusRow = () => {
        rows.forEach((r, i) => r.classList.toggle('active', i === active));
        box.setAttribute('aria-activedescendant', rows[active].id);
        rows[active].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      };
      box.addEventListener('focus', focusRow);
      box.addEventListener('blur', () => rows.forEach(r => r.classList.remove('active')));
      box.addEventListener('keydown', e => {
        const move = { ArrowDown: 1, ArrowUp: -1, Home: -1e6, End: 1e6 }[e.key];
        if (move !== undefined) { active = Math.max(0, Math.min(rows.length - 1, active + move)); focusRow(); e.preventDefault(); }
        else if (e.key === ' ' || e.key === 'Enter') { toggle(active); e.preventDefault(); }
      });
      api.el._spot = { rows: rows, sel: sel };
      api.el.append(K.block(q.block, box), h('div', { class: 'under' }, 'Click a line to mark it, or use the arrow keys and Space. Mark it again to clear it.'));
    },
    grade(q, picked) {
      const want = new Set(q.lines), got = new Set(picked || []);
      const extra = (picked || []).filter(n => !want.has(n));
      const missing = q.lines.filter(n => !got.has(n));
      if (!extra.length && !missing.length) return { ok: true };
      const lp = q.line_probes || {};
      const probe = extra.map(n => lp[String(n)]).find(Boolean) || null;
      const hint = extra.length && missing.length ? 'Some lines you marked are not needed, and a line that is needed is still unmarked.'
        : extra.length ? (extra.length === 1 ? 'One line you marked is not needed.' : extra.length + ' lines you marked are not needed.')
        : 'A line that is needed is still unmarked.';
      return { ok: false, probe: probe, hint: hint };
    },
    reveal(q, el) {
      const s = el._spot;
      if (!s) return;
      const want = new Set(q.lines);
      s.rows.forEach((r, i) => {
        const n = i + 1, on = s.sel.has(n);
        r.classList.add(want.has(n) ? (on ? 'right' : 'missed') : (on ? 'wrong' : 'plain'));
      });
      const notes = q.line_notes || {};
      const keys = Object.keys(notes).map(Number).sort((a, b) => a - b);
      if (keys.length) el.appendChild(h('ul', { class: 'spot-notes' }, keys.map(n => h('li', null, h('strong', null, 'Line ' + n + '. '), h('span', { html: C.inline(notes[n]) })))));
    },
    autoAnswer(q, el, right) {
      const s = el._spot;
      // a wrong answer marks the first line that is not part of the answer
      const want = right ? q.lines : [s.rows.findIndex((_, i) => q.lines.indexOf(i + 1) < 0) + 1];
      s.rows.forEach((r, i) => { if (s.sel.has(i + 1) !== (want.indexOf(i + 1) >= 0)) r.click(); });
    },
  });
})();
