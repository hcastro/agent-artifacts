/* Course helpers: DOM building, light markdown, icons and progress storage. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});

  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'data') Object.keys(v).forEach(d => { el.dataset[d] = v[d]; });
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(x => add(el, x)); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  // Content is authored as plain text, so everything is escaped before the two marks are applied.
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  // `code`, **bold**, a blank line starts a paragraph, a single newline is a line break
  function md(text) {
    return String(text || '').split(/\n{2,}/).map(p => '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>').join('');
  }

  const P = {
    spark: '<path d="M12 2l1.9 6.3a3 3 0 0 0 2 2L22 12l-6.1 1.7a3 3 0 0 0-2 2L12 22l-1.9-6.3a3 3 0 0 0-2-2L2 12l6.1-1.7a3 3 0 0 0 2-2z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    up: '<path d="M12 6l-7 8h14z"/>', down: '<path d="M12 18l7-8H5z"/>',
    mic: '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    map: '<path d="M4 6h10M4 12h16M4 18h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    learn: '<path d="M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3zM9 21h6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    cards: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    questions: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M12 8.2v3M12 13.4v.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  };
  function icon(name) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = P[name] || '';
    return s;
  }

  // ── storage: the viewer's private document in the page database, mirrored to localStorage ──
  // Documents live under data/users/<id>/ so each viewer reads and writes only their own progress.
  // `progress` holds the state (and an optional resume offer). `control` holds a reset marker.
  const Store = {
    key: 'course-v1', db: null, uid: null, ref: null, mode: 'local', offer: null, resetAt: 0, _t: null, _busy: false, _pending: null,
    local() { try { const t = localStorage.getItem(this.key); return t ? JSON.parse(t) : null; } catch (e) { return null; } },
    async init(key) {
      if (key) this.key = key;
      if (!window.claude || !window.claude.use) {
        try { this.offer = JSON.parse(localStorage.getItem(this.key + '-offer') || 'null'); } catch (e) { this.offer = null; }
        return this.local();
      }
      let remote = null, resetAt = 0;
      try {
        const got = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        const db = got[0], user = got[1];
        if (db && user) {
          this.uid = await user.id();
          if (this.uid) {
            this.db = db;
            this.ref = db.doc('data/users/' + this.uid + '/progress');
            const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000));
            const both = await Promise.race([Promise.all([this.ref.get(), db.doc('data/users/' + this.uid + '/control').get().catch(() => null)]), timeout]);
            const snap = both[0], ctl = both[1];
            if (ctl && ctl.exists) resetAt = Number((ctl.data() || {}).resetAt) || 0;
            if (snap && snap.exists) {
              const d = snap.data();
              remote = d && d.json ? JSON.parse(d.json) : null;
              if (d && d.resume && d.resume.levels) this.offer = d.resume;
            }
            this.mode = 'db';
          }
        }
      } catch (e) { this.mode = 'local'; this.ref = null; }
      let loc = this.local();
      if (resetAt) {
        // progress saved before the reset carries an older marker, or none, so it is dropped everywhere
        this.resetAt = resetAt;
        if (remote && (remote.epoch || 0) !== resetAt) { remote = null; this.offer = null; }
        if (loc && (loc.epoch || 0) !== resetAt) { loc = null; try { localStorage.removeItem(this.key); } catch (e) { /* storage blocked */ } }
      }
      if (remote && loc) return (remote.updated || 0) >= (loc.updated || 0) ? remote : loc;
      return remote || loc;
    },
    save(state) {
      if (this.resetAt) state.epoch = this.resetAt;
      try { localStorage.setItem(this.key, JSON.stringify(state)); } catch (e) { /* private window */ }
      if (!this.ref) return;
      this._pending = state;
      clearTimeout(this._t);
      this._t = setTimeout(() => this._flush(), 900);
    },
    async _flush() {
      if (this._busy || !this._pending || !this.ref) return;
      const s = this._pending; this._pending = null; this._busy = true;
      try {
        const eng = C.app && C.app.engine;
        const lv = {};
        if (eng) Object.keys(eng.stops).forEach(k => { lv[k] = eng.level(k); });
        const doc = { json: JSON.stringify(s), updated: s.updated, levels: lv, counter: s.counter, xp: s.xp, focus: s.focus || '' };
        if (this.offer) doc.resume = this.offer;
        await this.ref.set(doc);
      } catch (e) {
        // view-only access cannot write, so progress stays in this browser from here on
        this.mode = 'local'; this.ref = null;
      }
      this._busy = false;
      if (this._pending && this.ref) this._t = setTimeout(() => this._flush(), 900);
    },
    clear() {
      try { localStorage.removeItem(this.key); } catch (e) { /* storage blocked */ }
      if (this.ref) this.ref.delete().catch(() => {});
    },
  };

  async function getJSON(path) {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.json();
  }
  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) { const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = o; }, 1500); }
      return true;
    } catch (e) { return false; }
  }
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  C.h = h; C.esc = esc; C.md = md; C.inline = inline; C.icon = icon;
  C.Store = Store; C.getJSON = getJSON; C.copyText = copyText; C.reduced = reduced;
})();
