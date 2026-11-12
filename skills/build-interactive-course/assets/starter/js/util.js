/* Course helpers: DOM building, light markdown, icons, progress storage, copying and downloads. */
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

  // ── storage: the browser's local storage under the course's storage key ──
  // Nothing leaves the browser. A progress file or the save block moves progress somewhere else.
  // Some browsers give every file opened from disk one shared storage area, which is why each course
  // needs its own key.
  const Store = {
    key: 'course-v1', mode: 'local',
    init(key) {
      if (key) this.key = key;
      try {
        const t = localStorage.getItem(this.key);
        // a private window can read but throw on write, so prove a write works before relying on it
        localStorage.setItem(this.key + ':probe', '1');
        localStorage.removeItem(this.key + ':probe');
        return t ? JSON.parse(t) : null;
      } catch (e) {
        this.mode = 'memory';
        return null;
      }
    },
    save(state) {
      if (this.mode !== 'local') return;
      try { localStorage.setItem(this.key, JSON.stringify(state)); } catch (e) { this.mode = 'memory'; }
    },
    clear() {
      try { localStorage.removeItem(this.key); } catch (e) { /* storage blocked */ }
    },
  };

  // Clipboard access can be refused, for example on a page opened from disk in some browsers,
  // so fall back to the older copy command before giving up.
  async function copyText(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', top: '-1000px', opacity: '0' } });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    if (ok && btn) { const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = o; }, 1500); }
    return ok;
  }

  // Hands the learner a file to save. Works from disk too, because the file is built in memory.
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    const a = h('a', { href: url, download: name, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  C.h = h; C.esc = esc; C.md = md; C.inline = inline; C.icon = icon;
  C.Store = Store; C.copyText = copyText; C.download = download; C.reduced = reduced;
})();
