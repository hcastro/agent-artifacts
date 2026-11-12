/* `estimate`: the learner commits to a number before seeing the real one. Anything inside the accepted
   range counts. The reveal puts every guess on a scale next to the real value and the range. */
(function () {
  'use strict';
  const C = window.Course, K = C.components, h = C.h;

  // Accepts "1,200", "$27.50" or "27.5 days", because people type numbers the way they say them.
  const parse = t => { const m = /-?\d+(?:\.\d+)?/.exec(String(t).replace(/,/g, '')); return m ? parseFloat(m[0]) : NaN; };
  const fmt = (q, n) => (q.decimals !== undefined ? Number(n).toFixed(q.decimals) : String(Math.round(n * 100) / 100));
  const withUnit = (q, n) => fmt(q, n) + (q.unit ? ' ' + q.unit : '');

  K.register('estimate', {
    empty: 'Enter a number first.',
    usable: q => typeof q.value === 'number' && Array.isArray(q.range) && q.range.length === 2,
    render(q, api) {
      const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'est-input', id: 'est-' + q.id,
        'aria-label': 'Your estimate' + (q.unit ? ', in ' + q.unit : '') });
      input.addEventListener('input', () => { const v = parse(input.value); api.ready(Number.isFinite(v) ? v : null); });
      const exact = q.range[0] === q.range[1];
      api.el.append(h('div', { class: 'est' }, input, q.unit ? h('span', { class: 'unit' }, q.unit) : null),
        h('div', { class: 'under' }, exact ? 'Commit to a number before you see the real one. Only the exact value counts.' : 'Commit to a number before you see the real one. A number close to it counts.'));
    },
    grade(q, v) {
      const lo = q.range[0], hi = q.range[1];
      if (v >= lo && v <= hi) return { ok: true };
      const low = v < lo;
      return { ok: false, probe: (low ? q.probe_low : q.probe_high) || null, hint: low ? 'Your number is below the accepted range.' : 'Your number is above the accepted range.' };
    },
    reveal(q, el, result) {
      const guesses = (result.answers || []).filter(Number.isFinite);
      const lo = q.range[0], hi = q.range[1];
      const all = [lo, hi, q.value].concat(guesses);
      let min = q.scale ? q.scale[0] : Math.min.apply(null, all), max = q.scale ? q.scale[1] : Math.max.apply(null, all);
      if (!q.scale) { const pad = (max - min || Math.abs(max) || 1) * 0.15; min -= pad; max += pad; if (Math.min.apply(null, all) >= 0) min = Math.max(0, min); }
      const at = n => Math.max(0, Math.min(1, (n - min) / (max - min || 1)));
      // a label near either end is anchored to that end, so it never runs off a phone screen
      const side = n => (at(n) < 0.18 ? ' start' : at(n) > 0.82 ? ' end' : '');
      const pin = (n, kind, label) => {
        const p = h('span', { class: 'est-pin ' + kind + side(n) }, h('span', null, label));
        p.style.setProperty('--x', at(n));
        return p;
      };
      const band = h('span', { class: 'est-range' });
      band.style.setProperty('--a', at(lo));
      band.style.setProperty('--b', at(hi));
      const last = guesses[guesses.length - 1];
      const scale = h('div', { class: 'est-scale', role: 'img', 'aria-label': 'Your guess ' + (last !== undefined ? withUnit(q, last) : 'none') + ', real value ' + withUnit(q, q.value) + '.' },
        band, guesses.slice(0, -1).map(g => pin(g, 'earlier', '')), pin(q.value, 'real', 'Real: ' + withUnit(q, q.value)),
        last !== undefined ? pin(last, 'guess', 'You: ' + withUnit(q, last)) : null);
      const range = lo === hi ? '' : ' Anything from ' + withUnit(q, lo) + ' to ' + withUnit(q, hi) + ' counts.';
      el.append(scale, h('p', { class: 'est-read' }, (last !== undefined ? 'You said ' + withUnit(q, last) + '. ' : '') + 'The real value is ' + withUnit(q, q.value) + '.' + range));
    },
    autoAnswer(q, el, right) {
      const input = el.querySelector('.est-input');
      const span = Math.abs(q.range[1] - q.range[0]) || Math.abs(q.value) || 1;
      input.value = String(right ? q.value : q.range[1] + span * 2 + 1);
      input.dispatchEvent(new Event('input'));
    },
  });
})();
