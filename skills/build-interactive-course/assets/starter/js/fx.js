/* Course effects: sound cues, toasts and the level-up moment. Entrances ease out, nothing scales
   from zero, celebration is kept for rare events and never covers content the learner needs. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});
  const h = C.h;

  // Tiny synthesized cues, so the page ships no audio files.
  const Sound = {
    ctx: null, on: true,
    _ctx() {
      if (!this.on) return null;
      try {
        if (!this.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; this.ctx = new A(); }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      } catch (e) { return null; }
    },
    tone(freq, dur, opt) {
      const ctx = this._ctx(); if (!ctx) return;
      opt = opt || {};
      const t0 = ctx.currentTime + (opt.at || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = opt.type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
      const vol = opt.vol || 0.05;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    tick() { this.tone(920, 0.05, { vol: 0.025 }); },
    ok() { this.tone(659, 0.11, { type: 'triangle', vol: 0.06 }); this.tone(988, 0.16, { type: 'triangle', vol: 0.06, at: 0.09 }); },
    miss() { this.tone(220, 0.2, { to: 160, vol: 0.06 }); },
    card() { this.tone(1320, 0.07, { vol: 0.03 }); this.tone(1760, 0.09, { vol: 0.025, at: 0.06 }); },
    level() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.06, at: i * 0.1 })); this.tone(1568, 0.5, { vol: 0.03, at: 0.42 }); },
  };

  function toast(text) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const el = h('div', { class: 'toast', role: 'status' }, text);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2700);
  }

  function fly(text, anchor) {
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const el = h('div', { class: 'fly' }, text);
    el.style.left = Math.round(r.left + r.width / 2 - 20) + 'px';
    el.style.top = Math.round(r.top - 8) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function countTo(el, to, ms) {
    const from = parseInt(el.textContent.replace(/[^\d-]/g, ''), 10) || 0;
    if (C.reduced() || from === to) { el.textContent = String(to); return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / (ms || 700));
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // The level-up moment: a ring in the stop's line color draws itself, light leaves it outward, the number settles.
  function levelUp(info) {
    return new Promise(resolve => {
      const css = getComputedStyle(document.documentElement);
      const colors = [1, 2, 3, 4].map(n => css.getPropertyValue('--line-' + n).trim());
      const ringColor = css.getPropertyValue('--line-' + (info.color || 1)).trim();
      const canvas = h('canvas');
      const CIRC = 2 * Math.PI * 86;
      const ringSvg = '<svg class="ring" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="86" fill="none" stroke="var(--line)" stroke-width="10"/>' +
        '<circle id="lu-arc" cx="100" cy="100" r="86" fill="none" stroke="' + ringColor + '" stroke-width="10" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="' + CIRC + '" stroke-dashoffset="' + CIRC + '"/></svg>';
      const box = h('div', { class: 'lu' },
        h('div', { html: ringSvg, style: { position: 'relative' } }),
        h('div', { class: 'n num' }, String(info.to)),
        h('span', { class: 'eyebrow' }, info.down ? 'Level lowered' : 'Level earned'),
        h('h2', null, info.name),
        h('p', null, 'Level ' + info.to + ' of 5: ' + C.LEVELS[info.to] + '.'),
        info.note ? h('p', null, info.note) : null);
      const overlay = h('div', { class: 'levelup', role: 'dialog', 'aria-label': 'Level ' + info.to + ' in ' + info.name }, canvas, box);
      document.body.appendChild(overlay);
      let done = false;
      const key = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') close(); };
      const close = () => { if (done) return; done = true; document.removeEventListener('keydown', key); overlay.remove(); resolve(); };
      overlay.addEventListener('click', close);
      document.addEventListener('keydown', key);

      const arc = overlay.querySelector('#lu-arc');
      const frac = info.to / 5;
      if (C.reduced()) {
        arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - frac)));
        setTimeout(close, 2200);
        return;
      }
      if (!info.down) Sound.level(); else Sound.miss();
      arc.animate([{ strokeDashoffset: CIRC * (1 - (info.from || 0) / 5) }, { strokeDashoffset: CIRC * (1 - frac) }], { duration: 1300, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' });
      const num = box.querySelector('.n');
      num.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 520, delay: 500, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both' });
      Array.from(box.querySelectorAll('.eyebrow, h2, p')).forEach((el, i) => {
        el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 900 + i * 110, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'both' });
      });

      // particles are born on the arc as it draws, drift outward and fade
      if (!info.down) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = (canvas.width = innerWidth * dpr), H = (canvas.height = innerHeight * dpr);
        const g = canvas.getContext('2d');
        const rect = overlay.querySelector('.ring').getBoundingClientRect();
        const cx = (rect.left + rect.width / 2) * dpr, cy = (rect.top + rect.height / 2) * dpr, R = (rect.width / 200) * 86 * dpr;
        const parts = [];
        const t0 = performance.now();
        const frame = now => {
          if (done) return;
          const t = now - t0;
          const drawn = Math.min(1, t / 1300) * frac;
          if (t < 1500) {
            for (let i = 0; i < 5; i++) {
              const a = -Math.PI / 2 + drawn * 2 * Math.PI + (Math.random() - 0.5) * 0.25;
              const sp = (0.5 + Math.random() * 1.6) * dpr;
              parts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, vx: Math.cos(a) * sp + (Math.random() - 0.5) * dpr, vy: Math.sin(a) * sp + (Math.random() - 0.5) * dpr, life: 1, r: (1 + Math.random() * 2.4) * dpr, c: colors[(Math.random() * colors.length) | 0] });
            }
          }
          g.clearRect(0, 0, W, H);
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012;
            if (p.life <= 0) { parts.splice(i, 1); continue; }
            g.globalAlpha = Math.max(0, p.life) * 0.9;
            g.fillStyle = p.c;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
          }
          g.globalAlpha = 1;
          if (t < 3400) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }
      setTimeout(close, 3600);
    });
  }

  C.Sound = Sound; C.toast = toast; C.fly = fly; C.countTo = countTo; C.levelUp = levelUp;
})();
