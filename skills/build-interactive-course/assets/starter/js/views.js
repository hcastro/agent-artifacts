/* Course views: the map, the reference cards, the open questions and progress. */
(function () {
  'use strict';
  const C = (window.Course = window.Course || {});
  const h = C.h, icon = C.icon, md = C.md;
  const URGENCY = [[1, 'Ask first'], [2, 'Ask soon'], [3, 'Good to know']];

  // One line of the map: a colored line with a stop per topic. The ring around each stop fills with the level earned.
  function mapLine(t) {
    const app = C.app, eng = app.engine, placed = eng.s.placed[t.id];
    const sec = h('section', { class: 'mline line-' + t.color, 'aria-label': t.name });
    sec.appendChild(h('div', { class: 'mline-head' },
      h('span', { class: 'bullet', 'aria-hidden': 'true' }, t.id.length <= 2 ? t.id.toUpperCase() : String(t.color)), h('h2', null, t.name),
      h('span', { class: 'what' }, t.about), h('span', { class: 'pct num', title: 'Mastery on this line' }, eng.linePct(t.id) + '%')));
    const stops = h('div', { class: 'stops' });
    stops.style.setProperty('--n', t.stops.length);
    t.stops.forEach((k, i) => {
      const sk = eng.stops[k], L = eng.level(k), bar = eng.nextBar(k), here = eng.s.focus === k;
      const mk = h('span', { class: 'mk' }, h('b', { class: 'num' }, String(L)));
      // two frames so the ring animates from empty instead of painting full
      requestAnimationFrame(() => requestAnimationFrame(() => mk.style.setProperty('--p', L / 5)));
      const status = L >= 5 ? 'Can teach it' : placed && bar && bar.have ? bar.have + ' of 2 right answers toward level ' + bar.level : 'Level ' + L + ', ' + C.LEVELS[L];
      const stop = h('button', { class: 'stop' + (L >= 5 ? ' full' : ''), title: 'Start questions on ' + sk.name.toLowerCase(),
        onclick: () => { eng.setFocus(k); app.save(); app.go('learn'); } },
        here ? h('span', { class: 'here-tag' }, 'You are here') : null, mk, h('span', { class: 'nm' }, sk.name), sk.about ? h('span', { class: 'ds' }, sk.about) : null, h('span', { class: 'st' }, status));
      stop.style.setProperty('--i', i);
      stops.appendChild(stop);
    });
    sec.appendChild(stops);
    const fin = eng.s.finals[t.id], foot = h('div', { class: 'mline-foot' });
    if (!placed) {
      const n = eng.diagnosticSet(t.id).length;
      foot.append(h('button', { class: 'btn small', onclick: () => { eng.s.line = t.id; app.save(); app.go('learn'); } }, 'Take the placement'),
        h('span', null, eng.canResume(t.id) ? 'You can also pick up from your earlier session, which sets your starting levels the same way.' : 'Answer ' + n + ' question' + (n === 1 ? '' : 's') + ' and the course works out where you start at each stop.'));
    } else if (eng.mastered(t.id) && !(fin && fin.pass)) {
      foot.append(h('button', { class: 'btn primary small', onclick: () => { eng.s.line = t.id; app.go('learn'); C.Learn.startFinal(t.id); } }, 'Take the final'), h('span', null, 'You have reached the target level at every stop, so the final is open.'));
    } else if (fin && fin.pass) {
      foot.append(h('span', { class: 'chip good' }, 'Final passed ' + fin.score + '/' + fin.of));
    } else {
      foot.append(h('span', null, 'The ring around each stop fills in as you move up. To move up a level you have to get two different questions right, and one of them has to be on an idea you were not just shown.'));
    }
    sec.appendChild(foot);
    return sec;
  }

  const Views = {
    home(root) {
      const app = C.app, eng = app.engine, s = eng.s;
      const anyPlaced = eng.lines.some(t => s.placed[t.id]);
      const open = app.openAll().filter(a => !(s.open[a.id] || {}).done);
      const urgent = open.filter(a => a.urgency === 1);
      const p = eng.overall();
      const next = eng.standings.find(r => r[0] > p) || null;
      const lo = eng.standings.reduce((acc, r) => (r[0] <= p ? r[0] : acc), 0);
      const startLabel = anyPlaced ? 'Continue with ' + eng.stops[s.focus || eng.suggestFocus()].tag
        : eng.canResume() ? 'Pick up where you stopped'
        : 'Start with ' + eng.diagnosticSet(s.line).length + ' placement questions';
      const hero = h('div', { class: 'home-hero' },
        h('div', null,
          h('h1', null, app.course.home_title || app.course.title),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => app.go('learn') }, startLabel))),
        h('div', { class: 'home-aside' },
          h('button', { class: 'aside-row', onclick: () => app.go('questions') },
            h('b', null, open.length + ' open question' + (open.length === 1 ? '' : 's')),
            h('span', null, 'These are questions the sources could not answer. ' + (urgent.length === 0 ? 'None of them is urgent.' : urgent.length === 1 ? 'One of them is worth asking first.' : urgent.length + ' of them are worth asking first.'))),
          h('div', { class: 'aside-row' },
            h('b', null, eng.rank()),
            h('span', null, next ? 'You are at ' + p + '% mastery. The next standing, ' + next[1] + ', starts at ' + next[0] + '%.' : 'You are at ' + p + '% mastery, which is the top standing.'),
            h('div', { class: 'standing-bar' }, h('i', { style: { width: (next ? Math.max(2, (p - lo) / (next[0] - lo) * 100) : 100) + '%' } })))));
      const calib = h('div', { class: 'calib' });
      [['sure', 'Sure'], ['think', 'Think so'], ['guess', 'Guessing']].forEach(c => {
        const v = s.calib[c[0]] || [0, 0], pc = v[1] ? Math.round(v[0] / v[1] * 100) : 0;
        calib.appendChild(h('div', { class: 'calib-row' }, h('span', null, c[1]), h('span', { class: 'calib-bar' }, h('i', { style: { width: pc + '%' } })), h('span', { class: 'num muted' }, v[1] ? pc + '%' : 'n/a')));
      });
      const grid = h('div', { class: 'home-grid' },
        h('section', { class: 'mini' }, h('h3', null, 'Questions to ask first'),
          urgent.length ? h('ul', null, urgent.slice(0, 3).map(a => h('li', { html: C.inline(a.question) }))) : h('p', { class: 'muted' }, 'Nothing urgent is open.'),
          h('button', { class: 'btn small', onclick: () => app.go('questions') }, 'Open the list')),
        h('section', { class: 'mini' }, h('h3', null, 'How often you are right when you say'), calib,
          h('p', { class: 'muted', style: { fontSize: '14.5px', marginTop: '12px' } }, 'This is how often your first answer was right at each level of confidence you gave. When you say "Sure", you should be right nearly every time.')),
        h('section', { class: 'mini' }, h('h3', null, 'House rules'),
          h('ul', null,
            h('li', null, 'You get one question at a time. If you miss it, the next question is narrower, and you only see the answer after three misses.'),
            h('li', null, 'To move up a level you have to get two different questions right, one of them on an idea you were not just shown. Earlier stops come back as surprise reviews, and missing one costs you a level.'),
            h('li', null, 'The buttons under each question let you ask for a harder one, an easier one or the answer.'))));
      const map = h('div', { class: 'map' });
      eng.lines.forEach(t => map.appendChild(mapLine(t)));
      root.append(hero, map, grid);
    },

    cards(root) {
      const app = C.app, eng = app.engine;
      root.append(h('h1', { class: 'page-title' }, 'Cards'),
        h('p', { class: 'page-sub' }, 'Each card holds a short reference worth keeping. A card opens once you answer a question on its idea without being given the answer. ' + Object.keys(eng.s.cards).length + ' of ' + app.stats.cards + ' open.'));
      eng.lines.forEach(t => t.stops.forEach(k => {
        const cards = (app.content.stops[k] || {}).cards || [];
        if (!cards.length) return;
        const sk = eng.stops[k];
        const sect = h('section', { class: 'sect' }, h('h2', null, sk.name));
        const grid = h('div', { class: 'deck' });
        cards.forEach(c => {
          if (eng.s.cards[c.id]) {
            grid.appendChild(h('article', { class: 'ref' },
              h('div', { class: 'ref-head' }, h('span', { class: 'chip line-' + sk.color }, c.kind || 'note'), ' ', c.source ? h('code', null, c.source) : null, h('h3', null, c.title)),
              c.body ? h('pre', { tabindex: '0' }, c.body) : null,
              h('div', { class: 'nt', html: md(c.note || '') })));
          } else {
            const ideas = (c.ideas || []).map(i => (eng.ideaOf[i] || { name: i }).name.toLowerCase()).join(' or ');
            grid.appendChild(h('article', { class: 'ref locked' },
              h('div', { class: 'ref-head' }, h('span', { class: 'chip' }, icon('lock'), 'Locked'), h('h3', null, c.title),
                h('p', { class: 'muted', style: { fontSize: '13.5px', marginTop: '6px' } }, 'Opens on a question about ' + ideas + '.'))));
          }
        });
        sect.appendChild(grid);
        root.appendChild(sect);
      }));
    },

    questions(root) {
      const app = C.app, eng = app.engine, s = eng.s;
      const all = app.openAll();
      const text = () => all.filter(a => !(s.open[a.id] || {}).done).sort((x, y) => x.urgency - y.urgency).map((a, i) => (i + 1) + '. ' + a.question + (a.why ? '\n   Why: ' + a.why : '')).join('\n');
      const copyBtn = h('button', { class: 'btn small', onclick: () => C.copyText(text(), copyBtn).then(ok => { if (!ok) C.toast('Copy was blocked. Select the text on the page.'); }) }, 'Copy open questions');
      root.append(h('h1', { class: 'page-title' }, 'Open questions'),
        h('p', { class: 'page-sub' }, 'The sources behind this course could not answer these. Ask someone who knows, tick each one off and keep the answer here.'),
        h('div', { class: 'row', style: { marginBottom: '16px' } }, copyBtn));
      if (!all.length) root.appendChild(h('p', { class: 'muted' }, 'This course has no open questions.'));
      URGENCY.forEach(g => {
        const items = all.filter(a => a.urgency === g[0]);
        if (!items.length) return;
        const sect = h('section', { class: 'sect' }, h('h2', null, g[1] + ' (' + items.filter(a => !(s.open[a.id] || {}).done).length + ' open)'));
        const card = h('div', { class: 'card' });
        items.forEach(a => card.appendChild(this.openRow(a, eng.stops[a.stop])));
        sect.appendChild(card); root.appendChild(sect);
      });
    },

    openRow(a, sk) {
      const app = C.app, s = app.engine.s, st = s.open[a.id] || {};
      const row = h('div', { class: 'oq-item' + (st.done ? ' done' : '') });
      const cb = h('input', { type: 'checkbox', id: 'oq-' + a.id, 'aria-label': 'Answered: ' + a.question });
      cb.checked = !!st.done;
      cb.addEventListener('change', () => { s.open[a.id] = Object.assign({}, s.open[a.id], { done: cb.checked }); row.classList.toggle('done', cb.checked); app.save(); });
      const ta = h('textarea', { id: 'oq-note-' + a.id, placeholder: 'The answer, in a line or two.', 'aria-label': 'Notes for: ' + a.question });
      ta.value = st.note || '';
      ta.addEventListener('change', () => { s.open[a.id] = Object.assign({}, s.open[a.id], { note: ta.value }); app.save(); });
      row.append(cb, h('div', null,
        h('div', { class: 'q', html: C.inline(a.question) }),
        a.why ? h('div', { class: 'why', html: md(a.why) }) : null,
        h('div', { class: 'row', style: { marginTop: '6px', gap: '6px' } }, sk ? h('span', { class: 'chip line-' + sk.color }, sk.tag) : null, a.source ? h('code', { style: { fontSize: '11.5px' } }, a.source) : null),
        ta));
      return row;
    },

    progress(root) {
      const app = C.app, eng = app.engine, s = eng.s;
      const copy1 = h('button', { class: 'btn small', onclick: () => C.copyText(eng.ascii(), copy1) }, 'Copy map');
      const copy2 = h('button', { class: 'btn small', onclick: () => C.copyText(eng.saveBlock(), copy2) }, 'Copy state');
      const resume = h('textarea', { class: 'block', id: 'resume-box', placeholder: 'Paste a saved state block here', 'aria-label': 'Saved state to resume from' });
      const seg = (label, opts) => h('div', { class: 'seg', role: 'group', 'aria-label': label }, opts.map(o => h('button', { 'aria-pressed': String(o[1]), onclick: o[2] }, o[0])));
      const tgt = seg('Target level', [
        ['Target 4: independent', s.target === 4, () => { eng.setTarget(4); app.save(); app.render(); }],
        ['Target 5: can teach it', s.target === 5, () => { eng.setTarget(5); app.save(); app.render(); }]]);
      const setMech = v => { s.mechanics = v; app.save(); app.render(); };
      const mech = seg('Mechanics questions', [['Hidden', !s.mechanics, () => setMech(false)], ['Included', !!s.mechanics, () => setMech(true)]]);
      const outs = { clean: 0, helped: 0, told: 0 };
      s.log.forEach(l => { outs[l.out] = (outs[l.out] || 0) + 1; });
      const recent = s.log.slice(-12).reverse().map(l => {
        const q = eng.byId[l.q];
        return h('li', null, h('span', { class: 'chip ' + (l.out === 'clean' ? 'good' : l.out === 'told' ? 'bad' : 'warn') }, l.out === 'clean' ? 'First try' : l.out === 'told' ? 'Given away' : 'With a nudge'), ' ', q ? q.title : l.q, ' ', h('span', { class: 'muted' }, q && eng.stops[q.stop] ? '· ' + eng.stops[q.stop].tag : ''));
      });
      let confirmBox = null;
      const reset = h('button', { class: 'btn quiet small', onclick: () => {
        if (confirmBox) return;
        confirmBox = h('div', { class: 'note told', style: { marginTop: '10px' } }, h('span', { class: 'eyebrow' }, 'Erase all progress?'), h('p', null, 'Levels, history, cards and your notes on the open questions will be deleted.'),
          h('div', { class: 'row', style: { marginTop: '8px' } },
            h('button', { class: 'btn small', onclick: () => { C.Store.clear(); app.engine = new C.Engine(app.content, C.newState(app.course)); app.save(); app.go('home'); } }, 'Yes, erase it'),
            h('button', { class: 'btn quiet small', onclick: () => { confirmBox.remove(); confirmBox = null; } }, 'Keep it')));
        reset.parentNode.appendChild(confirmBox);
      } }, 'Erase progress');
      const restore = h('button', { class: 'btn small', onclick: () => {
        const st = C.Engine.parseBlock(resume.value);
        if (!st) { C.toast('That block could not be read.'); return; }
        app.engine = new C.Engine(app.content, app.fill(st)); app.save(); C.toast('State restored.'); app.go('home');
      } }, 'Restore');
      const voice = C.Tutor.tts ? h('button', { class: 'btn quiet small', 'aria-pressed': String(!!s.voice), onclick: () => { s.voice = !s.voice; app.save(); if (!s.voice) C.Tutor.hush(); app.render(); } }, s.voice ? 'Turn read-aloud off' : 'Turn read-aloud on') : null;
      const hidden = eng.hiddenCount();

      root.append(h('h1', { class: 'page-title' }, 'Progress'),
        h('p', { class: 'page-sub' }, s.counter + ' questions answered: ' + outs.clean + ' on the first try, ' + outs.helped + ' with a nudge, ' + outs.told + ' given away. Standing: ' + eng.rank() + '.'),
        h('section', { class: 'sect' }, h('h2', null, 'Skill map'), h('p', null, 'This is the same map in plain text, so you can paste it into a chat or a doc.'), h('pre', { class: 'block', tabindex: '0' }, eng.ascii()), h('div', { class: 'row', style: { marginTop: '10px' } }, copy1, tgt)),
        hidden ? h('section', { class: 'sect' }, h('h2', null, 'Mechanics questions'), h('p', null, hidden + ' question' + (hidden === 1 ? '' : 's') + ' only test details you could look up, such as an exact name or the order of steps. They are left out unless you turn them on here. Questions about how things fit together stay in, and they come after the questions that bear on a decision.'), mech) : null,
        h('section', { class: 'sect' }, h('h2', null, 'Recent answers'), recent.length ? h('ul', { class: 'plain-list' }, recent) : h('p', null, 'Nothing yet.')),
        h('section', { class: 'sect' }, h('h2', null, 'Save state'), h('p', null, 'Your progress saves by itself' + (C.Store.mode === 'db' ? ' to your private space on this page.' : ' in this browser.') + ' This block carries it into a chat with Claude: paste it after the words "resume from:" and the tutor picks up where you left off.'), h('pre', { class: 'block', tabindex: '0' }, eng.saveBlock()), h('div', { class: 'row', style: { marginTop: '10px' } }, copy2)),
        h('section', { class: 'sect' }, h('h2', null, 'Resume from a saved state'), resume, h('div', { class: 'row', style: { marginTop: '10px' } }, restore, reset)),
        h('section', { class: 'sect' }, h('h2', null, 'What this page can do right now'),
          h('ul', { class: 'plain-list' },
            h('li', null, 'Free-text grading by Claude: ', h('strong', null, C.Tutor.canGrade() ? 'on' : 'off'), C.Tutor.canGrade() ? '. Each graded answer uses a little of your Claude usage.' : '. Text answers fall back to checking yourself against the key points.'),
            h('li', null, 'Progress storage: ', h('strong', null, C.Store.mode === 'db' ? 'your private space on this page' : 'this browser only')),
            h('li', null, 'Dictation: ', h('strong', null, C.Tutor.dict ? 'available on text answers' : 'not available here')),
            h('li', null, 'Read-aloud: ', h('strong', null, C.Tutor.tts ? (s.voice ? 'on' : 'available, off') : 'not available here'), voice ? ' ' : null, voice),
            h('li', null, 'Content built ' + (app.content.built || '') + ': ' + app.stats.questions + ' questions across ' + Object.keys(eng.stops).length + ' stops.'))));
    },
  };

  C.Views = Views;
})();
