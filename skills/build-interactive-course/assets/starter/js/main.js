/* Course boot: read the course data built into the page, restore progress and route between views. */
(function () {
  'use strict';
  const C = window.Course, h = C.h, icon = C.icon;
  const NAV = [['home', 'Map', 'map'], ['learn', 'Learn', 'learn'], ['cards', 'Cards', 'cards'], ['questions', 'Questions', 'questions'], ['progress', 'Progress', 'spark']];
  const ROUTES = NAV.map(n => n[0]);

  const app = (C.app = {
    engine: null, content: null, course: null, stats: { cards: 0, questions: 0 }, final: null,
    save() { C.Store.save(this.engine.s); },
    // states saved by an older build lack newer keys, so they get the defaults
    fill(state) {
      const fresh = C.newState(this.course);
      Object.keys(fresh).forEach(k => { if (state[k] === undefined) state[k] = fresh[k]; });
      return state;
    },
    // Loads a progress file or a save block. Returns a sentence for the learner.
    loadProgress(text) {
      const got = C.Engine.parseProgress(text, this.course.storage_key);
      if (got.error) return { ok: false, message: got.error };
      if (got.state) {
        this.engine = new C.Engine(this.content, this.fill(got.state));
        this.save();
        return { ok: true, message: 'Progress loaded.' };
      }
      // starting levels from earlier tutoring, which the learner accepts or skips on the Learn page
      const eng = this.engine;
      eng.s.offer = got.offer;
      const line = eng.offerLine();
      if (!line) { eng.s.offer = null; return { ok: false, message: 'Those levels name no stop in this course.' }; }
      if (eng.s.placed[line.id]) { eng.s.offer = null; return { ok: false, message: 'You have already started ' + line.name.toLowerCase() + ' here, so the starting levels were not used. Erase progress first to start from them.' }; }
      eng.s.line = line.id;
      this.save();
      return { ok: true, message: 'Starting levels loaded. Open Learn to pick up from them.' };
    },
    openAll() {
      const out = [];
      Object.keys(this.engine.stops).forEach(k => ((this.content.stops[k] || {}).open_questions || []).forEach(a => out.push(Object.assign({ stop: k, urgency: 3 }, a))));
      return out;
    },
    route() { const r = (location.hash || '#home').slice(1); return ROUTES.indexOf(r) >= 0 ? r : 'home'; },
    go(name) { if (this.route() === name) this.render(); else location.hash = name; },
    render() {
      const r = this.route(), view = document.getElementById('view');
      C.Tutor.hush();
      view.innerHTML = '';
      const root = h('div', { class: 'view' });
      view.appendChild(root);
      document.querySelectorAll('[data-nav]').forEach(b => { if (b.dataset.nav === r) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      if (r === 'learn') C.Learn.render(root); else C.Views[r](root);
      this.meters();
      if (r !== 'learn') window.scrollTo(0, 0);
    },
    meters() {
      const s = this.engine.s;
      const st = document.getElementById('m-streak'), xp = document.getElementById('m-xp');
      if (st) { st.lastChild.textContent = String(s.streak); st.classList.toggle('hot', s.streak >= 3); st.title = s.streak + ' first-try answers in a row. Best: ' + s.best + '.'; }
      if (xp) C.countTo(xp.lastChild, s.xp, 700);
    },
  });

  function shell() {
    const s = app.engine.s;
    const nav = h('nav', { class: 'nav', 'aria-label': 'Sections' }, NAV.map(n => h('button', { data: { nav: n[0] }, onclick: () => app.go(n[0]) }, n[1])));
    const sound = h('button', { class: 'icon-btn', id: 'sound-btn', 'aria-label': 'Sound cues', 'aria-pressed': String(!!s.sound), title: 'Sound cues', onclick: () => {
      s.sound = !s.sound; C.Sound.on = s.sound; app.save();
      sound.innerHTML = ''; sound.appendChild(icon(s.sound ? 'sound' : 'mute')); sound.setAttribute('aria-pressed', String(s.sound));
      if (s.sound) C.Sound.ok();
    } }, icon(s.sound ? 'sound' : 'mute'));
    C.Sound.on = !!s.sound;
    document.getElementById('top-in').append(nav, h('div', { class: 'meters' },
      h('span', { class: 'meter', id: 'm-streak', title: 'First-try streak' }, icon('bolt'), h('span', { class: 'num' }, '0')),
      h('span', { class: 'meter xp', id: 'm-xp', title: 'Experience points' }, icon('spark'), h('span', { class: 'num' }, String(s.xp))),
      sound));
    const tab = document.getElementById('tabbar');
    NAV.forEach(n => tab.appendChild(h('button', { data: { nav: n[0] }, onclick: () => app.go(n[0]) }, icon(n[2]), n[1])));
  }

  function boot() {
    const view = document.getElementById('view');
    try {
      // the build puts the course data in the page, so nothing is fetched and the file opens from disk
      app.content = JSON.parse(document.getElementById('course-data').textContent);
      app.course = app.content.course;
      let state = C.Store.init(app.course.storage_key);
      if (state && (state.v !== 1 || !state.stops)) state = null;
      app.engine = new C.Engine(app.content, state ? app.fill(state) : C.newState(app.course));
      Object.keys(app.engine.stops).forEach(k => {
        const st = app.content.stops[k] || {};
        app.stats.cards += (st.cards || []).length;
        app.stats.questions += (st.questions || []).length;
      });
      shell();
      window.addEventListener('hashchange', () => app.render());
      app.render();
    } catch (e) {
      view.innerHTML = '';
      view.appendChild(h('div', { class: 'loading' }, h('p', null, 'The course did not start.'), h('p', { class: 'muted' }, String((e && e.message) || e)), h('button', { class: 'btn', onclick: () => location.reload() }, 'Reload')));
    }
  }

  // answer options by keyboard: A to F toggles the matching option
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
    const i = 'abcdef'.indexOf(e.key.toLowerCase());
    if (i < 0) return;
    const opts = document.querySelectorAll('.qcard .opts .opt');
    if (opts[i] && !opts[i].disabled) opts[i].click();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
