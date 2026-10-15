(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
    del(k) { try { window.localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };
  const readJSON = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mdi = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const pad = (x) => String(x).padStart(2, "0");

  /* ---------------- deck ---------------- */
  // Three ways to show the deck: inline on the page, present mode (the deck fills the window and
  // optionally the screen), and presenter view (current + next slide, notes, timer). Tabs that are
  // presenting or in presenter view follow each other through BroadcastChannel, with a
  // localStorage fallback, so a presenter tab can drive an audience tab on another screen.
  const deck = $("#deck");
  if (deck) {
    const root = document.documentElement;
    const stage = $("#deck-stage");
    const canvas = $("#deck-canvas");
    const slides = $$(".slide", canvas);
    const meta = readJSON("data-slides") || [];
    const n = slides.length;
    // Slides are drawn on a fixed canvas (1280x720 unless the deck says otherwise) and scaled to fit.
    const CW = Number(deck.dataset.canvasW) || 1280;
    const CH = Number(deck.dataset.canvasH) || 720;
    root.style.setProperty("--deck-cw", CW + "px");
    root.style.setProperty("--deck-ch", CH + "px");
    root.style.setProperty("--deck-ratio", CW + " / " + CH);
    root.style.setProperty("--deck-ar", String(CW / CH));
    // Storage keys and the sync channel carry the deck's key, so two decks on one origin
    // (local files all share file://) never drive each other.
    const NS = deck.dataset.deckKey || "deck";
    const curEls = $$("#deck-count .cur, #hud-count .cur");
    const bar = $("#deck-bar");
    const notes = $("#deck-notes");
    const notesBtn = $("#deck-notes-btn");
    const notesBody = $("#deck-notes-body");
    const notesMeta = $("#deck-notes-meta");
    const resumeBtn = $("#deck-resume");
    const presentBtn = $("#deck-present-btn");
    const presenterBtn = $("#deck-presenter-btn");
    const hud = $("#deck-hud");
    const hudTimer = $("#hud-timer");
    const hudFs = $("#hud-fs");
    const help = $("#deck-help");
    const toast = $("#deck-toast");
    const black = $("#deck-black");
    const fsPrompt = $("#deck-fsprompt");
    const KEY = NS + "-slide-n";
    const TIMER_KEY = NS + "-timer";
    const SYNC_KEY = NS + "-sync";
    let i = 0;
    let mode = "inline"; // inline | present | presenter
    let since = 0; // when this tab started presenting; the older tab answers a newcomer
    const planned = meta.map((m) => Number(m.minutes) || 0);
    const plannedBefore = planned.map((_, k) => planned.slice(0, k).reduce((a, b) => a + b, 0));
    const totalPlanned = planned.reduce((a, b) => a + b, 0);

    /* scaling: every stage has the canvas aspect ratio; its canvas is drawn at CW x CH and scaled to fit */
    const fit = (st, cv) => {
      const w = st.clientWidth;
      if (w) cv.style.setProperty("--s", (w / CW).toFixed(5));
    };
    const scale = () => fit(stage, canvas);
    scale();
    const ro = "ResizeObserver" in window ? new ResizeObserver((entries) => entries.forEach((e) => {
      const cv = e.target.querySelector(".deck-canvas");
      if (cv) fit(e.target, cv);
    })) : null;
    if (ro) ro.observe(stage); else window.addEventListener("resize", scale);

    /* timer: starts the first time you present, survives a reload, shared by nothing */
    const timer = (() => {
      let t = { start: 0, acc: 0, running: false };
      try { t = { ...t, ...JSON.parse(store.get(TIMER_KEY) || "{}") }; } catch (e) { /* fresh timer */ }
      const save = () => store.set(TIMER_KEY, JSON.stringify(t));
      // Every window shows the same timer: a change in one reaches the others through storage.
      window.addEventListener("storage", (e) => {
        if (e.key !== TIMER_KEY || !e.newValue) return;
        try { t = { ...t, ...JSON.parse(e.newValue) }; } catch (err) { /* keep ours */ }
      });
      return {
        ms: () => t.acc + (t.running ? Date.now() - t.start : 0),
        running: () => t.running,
        start() { if (!t.running) { t.start = Date.now(); t.running = true; save(); } },
        pause() { if (t.running) { t.acc += Date.now() - t.start; t.running = false; save(); } },
        reset() { t = { start: Date.now(), acc: 0, running: t.running }; save(); },
      };
    })();
    /* the time (timer, clock and pace) can be hidden per window with T; an audience window starts hidden */
    const TIME_KEY = NS + "-time";
    let showTime = store.get(TIME_KEY) !== "off";
    const hudTime = $("#hud-time");
    const applyTime = () => {
      root.classList.toggle("deck-time-off", !showTime);
      if (hudTime) { hudTime.setAttribute("aria-pressed", showTime ? "true" : "false"); hudTime.textContent = showTime ? "Hide time" : "Show time"; }
      if (pv) { const b = $('[data-pv="time"]', pv.el); if (b) b.textContent = showTime ? "Hide time" : "Show time"; }
    };
    const setTime = (on, save = true) => {
      showTime = on;
      if (save) store.set(TIME_KEY, on ? "on" : "off");
      applyTime();
    };
    const clock = (ms) => {
      const s = Math.max(0, Math.round(ms / 1000));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
      return (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(r);
    };

    /* sync between tabs and windows. Every message carries a per-tab sequence number, because
       BroadcastChannel and the localStorage fallback can both deliver the same message. Tabs that
       are presenting say "here" every few seconds, so presenter view knows whether an audience
       window is showing the slides. */
    const tabId = Math.random().toString(36).slice(2);
    let chan = null;
    try { chan = "BroadcastChannel" in window ? new BroadcastChannel(NS) : null; } catch (e) { chan = null; }
    const lastSeen = {};
    const peers = {}; // tabId -> { mode, i, t } for other tabs that are presenting
    let seq = 0;
    const post = (msg) => {
      const m = { ...msg, from: tabId, seq: ++seq, t: Date.now() };
      try { if (chan) chan.postMessage(m); } catch (e) { /* channel closed */ }
      store.set(SYNC_KEY, JSON.stringify(m));
    };
    const send = (msg) => { if (mode !== "inline") post(msg); };
    const receive = (m) => {
      if (!m || m.from === tabId) return;
      if (lastSeen[m.from] && lastSeen[m.from] >= m.seq) return;
      lastSeen[m.from] = m.seq;
      if (m.type === "hello" || m.type === "here") peers[m.from] = { mode: m.mode, i: m.i, t: Date.now() };
      if (m.type === "go" && peers[m.from]) { peers[m.from].i = m.i; peers[m.from].t = Date.now(); }
      if (m.type === "bye") delete peers[m.from];
      if (mode === "inline") return;
      if (m.type === "who" || m.type === "hello") post({ type: "here", mode, i });
      if (m.type === "hello" && since && since < m.since) send({ type: "go", i });
      if (m.type === "go") { show(m.i, { broadcast: false }); post({ type: "here", mode, i }); }
      if (m.type === "black") setBlack(m.on, false);
    };
    if (chan) chan.onmessage = (e) => receive(e.data);
    window.addEventListener("storage", (e) => {
      if (e.key !== SYNC_KEY || !e.newValue) return;
      try { receive(JSON.parse(e.newValue)); } catch (err) { /* ignore */ }
    });
    setInterval(() => { if (mode !== "inline") post({ type: "here", mode, i }); }, 4000);
    window.addEventListener("pagehide", () => { if (mode !== "inline") post({ type: "bye" }); });
    const audiencePeer = () => {
      const now = Date.now();
      return Object.values(peers).find((p) => p.mode === "present" && now - p.t < 10000) || null;
    };

    const notesHTML = (m) => {
      const paras = m && m.notes ? String(m.notes).split(/\n\n+/) : ["No notes for this slide."];
      return paras.map((p) => {
        const lab = p.match(/^(Say|Purpose|Evidence|Limit|Next|Prompts if the room is quiet|If asked [^:]+|Reminder[^:]*):\s*/);
        if (!lab) return "<p>" + mdi(p).replace(/\n/g, "<br>") + "</p>";
        const cls = lab[1] === "Say" ? "n-say" : "n-" + lab[1].split(/[ ,]/)[0].toLowerCase();
        // A single line break inside a paragraph is kept, so a reminder can list steps.
        return '<p class="' + cls + '"><span class="n-lab">' + esc(lab[1]) + "</span> " + mdi(p.slice(lab[0].length)).replace(/\n/g, "<br>") + "</p>";
      }).join("");
    };

    /* presenter view: built on first use, from clones of the slides */
    let pv = null;
    const buildPresenter = () => {
      const el = document.createElement("div");
      el.className = "presenter";
      el.id = "presenter";
      el.hidden = true;
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", "Presenter view");
      el.innerHTML =
        '<header class="pv-head">' +
          '<p class="pv-title">Presenter view</p>' +
          '<p class="pv-clock" aria-label="Current time"></p>' +
          '<p class="pv-elapsed"><span class="pv-lab">elapsed</span> <span class="pv-el">00:00</span></p>' +
          '<p class="pv-pace"></p>' +
          '<span class="pv-gap"></span>' +
          '<button type="button" class="pv-btn pv-aud-btn" data-pv="aud" data-state="none"><span class="pv-dot" aria-hidden="true"></span><span class="pv-aud-t">No audience window</span> <kbd>A</kbd></button>' +
          '<button type="button" class="pv-btn" data-pv="timer">Start timer</button>' +
          '<button type="button" class="pv-btn" data-pv="reset">Reset</button>' +
          '<button type="button" class="pv-btn" data-pv="time">Hide time</button>' +
          '<button type="button" class="pv-btn" data-pv="fs">Full screen</button>' +
          '<button type="button" class="pv-btn" data-pv="exit">Exit <kbd>Esc</kbd></button>' +
        "</header>" +
        '<div class="pv-body">' +
          '<section class="pv-cur" aria-label="Current slide"><div class="pv-stage"><div class="deck-canvas"></div></div>' +
            '<div class="pv-bar"><span></span></div></section>' +
          '<aside class="pv-side">' +
            '<div class="pv-next"><p class="pv-lab">next</p><div class="pv-stage"><div class="deck-canvas"></div></div><p class="pv-next-t"></p></div>' +
            '<div class="pv-notes" tabindex="0" aria-label="Speaker notes"><p class="pv-meta"></p><div class="pv-notes-body"></div></div>' +
          "</aside>" +
        "</div>" +
        '<footer class="pv-foot">' +
          '<button type="button" class="pv-btn" data-pv="prev">← Prev</button>' +
          '<p class="pv-count"></p>' +
          '<button type="button" class="pv-btn" data-pv="next">Next →</button>' +
          '<label class="pv-jump">go to <select aria-label="Go to slide"></select></label>' +
          '<p class="pv-tip"></p>' +
        "</footer>" +
        '<div class="pv-aud" role="dialog" aria-label="Show the slides on another screen" hidden>' +
          '<p class="pv-aud-h">Show the slides on another screen</p>' +
          '<div class="pv-aud-screens" hidden><p class="pv-lab">open on</p><div class="pv-aud-list"></div></div>' +
          '<ol class="pv-aud-steps">' +
            '<li class="pv-aud-s1"></li>' +
            "<li>Drag that window to the screen the room sees.</li>" +
            "<li>Click the slide once. It goes full screen on that monitor.</li>" +
          "</ol>" +
          '<p class="pv-aud-why" hidden>claude.ai won\'t load in a window this page opens by itself, so the slides window has to come from you. It still follows this one.</p>' +
          '<p class="pv-aud-url"><code></code> <button type="button" class="pv-btn" data-pv="copy">Copy link</button></p>' +
          '<p class="pv-aud-note">Both screens have to be set to extend the desktop. If they mirror each other, change it in System Settings → Displays.</p>' +
          '<p class="pv-aud-row"><button type="button" class="pv-btn" data-pv="screens" hidden>Find my screens</button><span class="pv-gap"></span><button type="button" class="pv-btn" data-pv="aud-close">Close</button></p>' +
        "</div>";
      document.body.appendChild(el);
      const [curCanvas, nextCanvas] = $$(".deck-canvas", el);
      slides.forEach((s) => {
        [curCanvas, nextCanvas].forEach((cv) => {
          const c = s.cloneNode(true);
          c.removeAttribute("id");
          c.hidden = true;
          c.classList.remove("is-in");
          $$("[id]", c).forEach((x) => { if (!x.closest("svg")) x.removeAttribute("id"); });
          cv.appendChild(c);
        });
      });
      const sel = $("select", el);
      sel.innerHTML = meta.map((m, k) => '<option value="' + k + '">' + pad(k + 1) + " · " + esc(m.title || "") + "</option>").join("");
      sel.addEventListener("change", () => show(parseInt(sel.value, 10)));
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pv]");
        if (!b) return;
        const a = b.dataset.pv;
        if (a === "prev") show(i - 1);
        else if (a === "next") show(i + 1);
        else if (a === "timer") { timer.running() ? timer.pause() : timer.start(); tick(); }
        else if (a === "reset") { timer.reset(); tick(); }
        else if (a === "time") setTime(!showTime);
        else if (a === "fs") toggleFs(el);
        else if (a === "exit") setMode("inline");
        else if (a === "aud") { openAudience(); showAudPanel(true); }
        else if (a === "aud-close") showAudPanel(false);
        else if (a === "copy") copyAudLink(b);
        else if (a === "screens") findScreens();
        else if (a === "screen") openAudience({ screen: screenList[parseInt(b.dataset.k, 10)], replace: true });
      });
      $$(".pv-stage", el).forEach((st) => { if (ro) ro.observe(st); });
      $(".pv-aud-url code", el).textContent = audienceHref();
      $(".pv-tip", el).textContent = framed
        ? "Slides for the room: open the copied link in a new window (⌘N). A copies it again."
        : "The audience window follows this one. Drag it to the screen the room sees, then click it once for full screen.";
      $(".pv-aud-why", el).hidden = !framed;
      pv = {
        el, curCanvas, nextCanvas, sel,
        clock: $(".pv-clock", el), el_t: $(".pv-el", el), pace: $(".pv-pace", el), timerBtn: $('[data-pv="timer"]', el),
        meta: $(".pv-meta", el), body: $(".pv-notes-body", el), count: $(".pv-count", el), nextT: $(".pv-next-t", el),
        bar: $(".pv-bar span", el), notesBox: $(".pv-notes", el),
        audBtn: $(".pv-aud-btn", el), audT: $(".pv-aud-t", el), aud: $(".pv-aud", el),
        screens: $(".pv-aud-screens", el), screenBox: $(".pv-aud-list", el), findBtn: $('[data-pv="screens"]', el),
      };
      if (window.getScreenDetails && !framed) pv.findBtn.hidden = false;
      setStep1(framed ? null : "local");
      applyTime();
    };

    /* the audience window: a second window that shows the slides in present mode. S opens it
       together with presenter view. A popup can land on another monitor only when the browser
       grants window management; otherwise it opens here and gets dragged over. When the frame
       refuses popups, the panel offers a plain link instead. */
    const PUBLISHED = deck.dataset.publishedUrl || "";
    const local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    // Inside claude.ai the page runs in a sandboxed frame. A window it opens inherits the sandbox,
    // and claude.ai refuses to load there (ERR_BLOCKED_BY_RESPONSE), so the published page copies
    // the link and the presenter opens the window.
    const framed = window.__deckFramed === true || (!!PUBLISHED && !local);
    const audienceHref = () => (PUBLISHED && !local ? PUBLISHED : location.href.split("#")[0]) + "#present";
    const setStep1 = (state) => {
      if (!pv) return;
      const li = $(".pv-aud-s1", pv.aud);
      if (state === "local") {
        li.innerHTML = '<a class="pv-aud-link" target="_blank" rel="noopener" href="' + esc(audienceHref()) + '">Open the audience window</a> if it didn\'t open by itself.';
        return;
      }
      li.textContent = state === "copied"
        ? "The link is copied. Press ⌘N for a new browser window, paste it into the address bar and press Return."
        : "Copy the link below, press ⌘N for a new browser window, then paste it into the address bar.";
    };
    const copyText = (text) => {
      try { return navigator.clipboard.writeText(text).then(() => true, () => false); }
      catch (e) { return Promise.resolve(false); }
    };
    let audWin = null;
    let audOpenedAt = 0;
    let screenList = [];
    const openAudience = (opts = {}) => {
      if (framed) {
        if (audiencePeer()) return true;
        audOpenedAt = Date.now();
        showAudPanel(true);
        copyText(audienceHref()).then((ok) => {
          setStep1(ok ? "copied" : null);
          say(ok ? "Slides link copied. Press ⌘N, paste it, and drag that window to the room's screen."
                 : "Copy the slides link from the panel, then open it in a new window.");
        });
        tick();
        return false;
      }
      const open = audWin && !audWin.closed;
      if (!opts.replace && (open || audiencePeer())) {
        if (open) { try { audWin.focus(); } catch (e) { /* focus is optional */ } }
        return true;
      }
      if (open && opts.replace) { try { audWin.close(); } catch (e) { /* already gone */ } }
      const sc = opts.screen;
      const feat = sc
        ? "popup,left=" + sc.availLeft + ",top=" + sc.availTop + ",width=" + sc.availWidth + ",height=" + sc.availHeight
        : "popup,width=1280,height=760";
      let w = null;
      try { w = window.open(audienceHref(), NS + "-audience", feat); } catch (e) { w = null; }
      if (!w) { showAudPanel(true); return false; }
      audWin = w;
      audOpenedAt = Date.now();
      say(sc ? "Audience window opened on " + (sc.label || "the other screen") + ". Click it once for full screen."
             : "Audience window opened. Drag it to the screen the room sees, then click it once.");
      tick();
      return true;
    };
    const showAudPanel = (on) => {
      if (!pv) return;
      pv.aud.hidden = !on;
      if (on) { const l = $(".pv-aud-link, [data-pv=\"copy\"]", pv.aud); try { l.focus({ preventScroll: true }); } catch (e) { /* optional */ } }
    };
    const copyAudLink = (b) => {
      const url = audienceHref();
      const done = (ok) => {
        b.textContent = ok ? "Copied" : "Select and copy";
        if (ok && framed) { setStep1("copied"); audOpenedAt = Date.now(); }
        setTimeout(() => { b.textContent = "Copy link"; }, 1800);
      };
      const pick = () => { const r = document.createRange(); r.selectNodeContents($(".pv-aud-url code", pv.aud)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(url).then(() => done(true), () => { pick(); done(false); }); }
      catch (e) { pick(); done(false); }
    };
    const findScreens = async () => {
      let sd = null;
      try { sd = await window.getScreenDetails(); } catch (e) { sd = null; }
      if (!sd || !sd.screens || sd.screens.length < 2) {
        pv.findBtn.hidden = true;
        say(sd ? "Only one screen is connected." : "This page can't list your screens here. Drag the window instead.");
        return;
      }
      screenList = sd.screens;
      pv.screenBox.innerHTML = screenList.map((s, k) =>
        '<button type="button" class="pv-btn" data-pv="screen" data-k="' + k + '">' +
        esc(s.label || "Screen " + (k + 1)) + " · " + s.width + "×" + s.height + (s === sd.currentScreen ? " · this screen" : "") + "</button>").join("");
      pv.screens.hidden = false;
      pv.findBtn.hidden = true;
    };
    const refitPresenter = () => { if (pv) $$(".pv-stage", pv.el).forEach((st) => fit(st, $(".deck-canvas", st))); };
    const renderPresenter = () => {
      if (!pv) return;
      const cs = pv.curCanvas.children, ns = pv.nextCanvas.children;
      for (let k = 0; k < cs.length; k++) { cs[k].hidden = k !== i; ns[k].hidden = k !== i + 1; }
      const m = meta[i] || {};
      pv.meta.textContent = "Slide " + pad(i + 1) + " of " + pad(n) + (m.minutes ? " · planned " + m.minutes + " min" : "");
      pv.body.innerHTML = notesHTML(m);
      pv.notesBox.scrollTop = 0;
      pv.count.textContent = pad(i + 1) + " / " + pad(n);
      pv.nextT.textContent = i + 1 < n ? (meta[i + 1] || {}).title || "" : "End of the deck";
      pv.sel.value = String(i);
      pv.bar.style.width = ((i + 1) / n) * 100 + "%";
      tick();
    };

    /* one clock drives the HUD timer and the presenter header */
    const tick = () => {
      const ms = timer.ms();
      if (hudTimer) hudTimer.textContent = clock(ms);
      if (!pv || pv.el.hidden) return;
      const peer = audiencePeer();
      if (peer) audOpenedAt = 0; // connected: from here on, no peer means the window is gone
      const st = peer ? "on" : audOpenedAt && Date.now() - audOpenedAt < (framed ? 120000 : 15000) ? "wait" : "none";
      pv.audBtn.dataset.state = st;
      pv.audT.textContent = st === "on" ? "Audience window on slide " + pad((peer.i || 0) + 1)
        : st === "wait" ? "Waiting for the audience window" : "No audience window";
      const now = new Date();
      pv.clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
      pv.el_t.textContent = clock(ms);
      pv.timerBtn.textContent = timer.running() ? "Pause timer" : (ms ? "Resume timer" : "Start timer");
      // Pace: elapsed time against the planned start of this slide.
      const planMs = plannedBefore[i] * 60000;
      const diff = ms - planMs;
      if (!ms) { pv.pace.textContent = "plan " + clock(totalPlanned * 60000); pv.pace.dataset.state = ""; return; }
      const behind = diff > 45000, ahead = diff < -45000;
      pv.pace.dataset.state = behind ? "behind" : ahead ? "ahead" : "on";
      pv.pace.textContent = behind ? clock(diff) + " behind plan" : ahead ? clock(-diff) + " ahead of plan" : "on pace";
    };
    setInterval(tick, 1000);

    /* navigation */
    const show = (k, opts = {}) => {
      if (!n) return;
      const { save = true, broadcast = true } = opts;
      k = Math.max(0, Math.min(n - 1, k));
      const moved = k !== i;
      if (slides[i]) { slides[i].hidden = true; slides[i].classList.remove("is-in"); }
      i = k;
      const s = slides[i];
      s.hidden = false;
      if (!reduced && moved) { void s.offsetWidth; s.classList.add("is-in"); }
      curEls.forEach((c) => { c.textContent = pad(i + 1); });
      if (bar) bar.style.width = ((i + 1) / n) * 100 + "%";
      const m = meta[i] || {};
      if (notesMeta) notesMeta.textContent = "Slide " + pad(i + 1) + " · " + (m.title || "") + (m.minutes ? " · " + m.minutes + " min" : "");
      if (notesBody) notesBody.innerHTML = notesHTML(m);
      if (save) store.set(KEY, String(i + 1));
      if (resumeBtn && !resumeBtn.hidden && i + 1 === resumeAt) resumeBtn.hidden = true;
      renderPresenter();
      if (broadcast) send({ type: "go", i });
    };

    /* full screen is optional: present mode already fills the window without it */
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    const canFs = !!(deck.requestFullscreen || deck.webkitRequestFullscreen);
    const toggleFs = (target) => {
      try {
        if (fsEl()) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          const p = exit && exit.call(document);
          if (p && p.catch) p.catch(() => {});
        } else {
          const req = target.requestFullscreen || target.webkitRequestFullscreen;
          const p = req && req.call(target);
          if (p && p.catch) p.catch(() => say("Full screen isn't available here. The slides still fill this window."));
        }
      } catch (e) { say("Full screen isn't available here. The slides still fill this window."); }
    };
    if (!canFs && hudFs) hudFs.hidden = true;
    const onFsChange = () => {
      const on = !!fsEl();
      if (on && fsPrompt) fsPrompt.hidden = true;
      if (hudFs) hudFs.textContent = on ? "Exit full screen" : "Full screen";
      if (pv) { const b = $('[data-pv="fs"]', pv.el); if (b) b.textContent = on ? "Exit full screen" : "Full screen"; }
      requestAnimationFrame(() => { scale(); refitPresenter(); });
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    let toastT = 0;
    const say = (msg) => {
      if (!toast) return;
      toast.textContent = msg;
      toast.hidden = false;
      clearTimeout(toastT);
      toastT = setTimeout(() => { toast.hidden = true; }, 2600);
    };

    const setBlack = (on, broadcast = true) => {
      if (!black) return;
      black.hidden = !on;
      if (broadcast) send({ type: "black", on });
    };

    /* the HUD shows while the pointer moves and hides after a pause; the cursor hides with it */
    let idleT = 0;
    const wake = () => {
      if (mode !== "present") return;
      deck.classList.add("hud-on");
      clearTimeout(idleT);
      idleT = setTimeout(() => { if (!hud.matches(":hover, :focus-within")) deck.classList.remove("hud-on"); }, 2200);
    };
    deck.addEventListener("mousemove", wake);
    deck.addEventListener("pointerdown", wake);

    const setMode = (next, opts = {}) => {
      if (next === mode) return;
      const prev = mode;
      mode = next;
      root.classList.toggle("deck-presenting", next !== "inline");
      root.classList.toggle("deck-pv", next === "presenter");
      deck.classList.toggle("is-presenting", next === "present");
      if (next === "presenter") {
        if (!pv) buildPresenter();
        pv.el.hidden = false;
        renderPresenter();
        requestAnimationFrame(refitPresenter);
        try { pv.el.focus({ preventScroll: true }); } catch (e) { /* focus is optional */ }
        // Only a key press or click may open a window, so the #presenter entry leaves it to A.
        if (opts.audience) openAudience();
      } else if (pv) {
        pv.el.hidden = true;
        showAudPanel(false);
      }
      if (fsPrompt) fsPrompt.hidden = !(next === "present" && opts.fsPrompt && canFs && !fsEl());
      if (next === "present") {
        help.hidden = true;
        if (!opts.fsPrompt) timer.start(); // an audience window leaves the timer to presenter view
        else setTime(false, false); // and keeps the time off the room's screen unless T brings it back
        wake();
        if (opts.fullscreen && canFs) toggleFs(deck);
        else if (!opts.quiet) say(canFs ? "Presenting. Press F for full screen, Esc to stop." : "Presenting. Press Esc to stop.");
        try { deck.focus({ preventScroll: true }); } catch (e) { deck.focus(); }
      } else {
        deck.classList.remove("hud-on");
        setBlack(false, false);
        help.hidden = true;
      }
      if (next === "inline" && fsEl()) toggleFs(deck);
      if (prev === "inline" && next !== "inline") { since = Date.now(); send({ type: "hello", since, mode: next, i }); }
      else if (next !== "inline") post({ type: "here", mode: next, i });
      if (next === "inline") { since = 0; post({ type: "bye" }); }
      requestAnimationFrame(() => { scale(); refitPresenter(); });
      tick();
    };

    /* keyboard: one handler while presenting (anywhere on the page), the deck's own when inline */
    let digits = "";
    let digitsT = 0;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest("input, textarea, select")) return;
      let handled = true;
      const k = e.key;
      if (mode === "presenter" && e.target.closest && e.target.closest(".pv-notes") && (k === "ArrowUp" || k === "ArrowDown")) return;
      if (/^[0-9]$/.test(k) && mode !== "inline") {
        digits += k;
        clearTimeout(digitsT);
        digitsT = setTimeout(() => { digits = ""; }, 1800);
        say("Go to slide " + digits + ", then Enter");
        e.preventDefault();
        return;
      }
      switch (k) {
        case "ArrowRight": case "ArrowDown": case "PageDown": show(i + 1); break;
        case "ArrowLeft": case "ArrowUp": case "PageUp": show(i - 1); break;
        case " ": case "Spacebar": show(i + (e.shiftKey ? -1 : 1)); break;
        case "Home": show(0); break;
        case "End": show(n - 1); break;
        case "Enter":
          if (digits) { show(parseInt(digits, 10) - 1); digits = ""; if (toast) toast.hidden = true; }
          else if (mode === "inline") handled = false;
          else show(i + 1);
          break;
        case "n": case "N": if (mode === "inline") toggleNotes(); else handled = false; break;
        case "p": case "P": setMode(mode === "present" ? "inline" : "present", { fullscreen: true }); break;
        case "s": case "S": setMode(mode === "presenter" ? "inline" : "presenter", { audience: true }); break;
        case "a": case "A": if (mode === "presenter") { openAudience(); showAudPanel(true); } else handled = false; break;
        case "f": case "F":
          if (mode === "inline") setMode("present", { fullscreen: true });
          else toggleFs(mode === "presenter" && pv ? pv.el : deck);
          break;
        case "t": case "T": if (mode !== "inline") { setTime(!showTime); say(showTime ? "Time shown. Press T to hide it." : "Time hidden. Press T to show it."); } else handled = false; break;
        case "b": case "B": case ".": if (mode !== "inline") setBlack(black.hidden); else handled = false; break;
        case "?": if (mode === "present") { help.hidden = !help.hidden; wake(); } else handled = false; break;
        case "Escape":
          if (!help.hidden) help.hidden = true;
          else if (pv && !pv.aud.hidden) showAudPanel(false);
          else if (black && !black.hidden) setBlack(false);
          else if (mode !== "inline") setMode("inline");
          else handled = false;
          break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); wake(); }
    };
    document.addEventListener("keydown", (e) => {
      if (mode !== "inline") { onKey(e); return; }
      if (deck.contains(document.activeElement)) onKey(e);
    });

    /* clicks: arrows and edges step; a click on the slide itself steps forward while presenting */
    deck.addEventListener("click", (e) => {
      const b = e.target.closest("[data-go]");
      if (b && deck.contains(b)) { show(i + parseInt(b.dataset.go, 10)); return; }
      if (mode === "present" && e.target.closest(".deck-canvas") && !e.target.closest("a, button, [data-no-advance]")) show(i + 1);
    });
    if (hudFs) hudFs.addEventListener("click", () => toggleFs(deck));
    if (hudTime) hudTime.addEventListener("click", () => setTime(!showTime));
    applyTime();
    $("#hud-exit") && $("#hud-exit").addEventListener("click", () => setMode("inline"));
    $("#hud-help") && $("#hud-help").addEventListener("click", () => { help.hidden = !help.hidden; });
    if (black) black.addEventListener("click", () => setBlack(false));
    if (presentBtn) presentBtn.addEventListener("click", () => setMode("present", { fullscreen: true }));
    if (presenterBtn) presenterBtn.addEventListener("click", () => setMode("presenter", { audience: true }));
    if (fsPrompt) fsPrompt.addEventListener("click", () => { fsPrompt.hidden = true; toggleFs(deck); });

    const toggleNotes = () => {
      const on = notes.hidden;
      notes.hidden = !on;
      notesBtn.setAttribute("aria-pressed", on ? "true" : "false");
      deck.classList.toggle("notes-on", on);
      scale();
    };
    notesBtn.addEventListener("click", toggleNotes);

    let tx = null, ty = null;
    stage.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      tx = t.clientX; ty = t.clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (tx === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tx, dy = t.clientY - ty;
      tx = ty = null;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) show(i + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* entry points: the hero button, #slide-<id>, #present and #presenter */
    $$("[data-present]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      show(0);
      setMode("present", { fullscreen: true });
    }));
    const fromHash = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h.startsWith("slide-")) return -1;
      return slides.findIndex((s) => s.id === h);
    };
    const start = fromHash();
    const saved = parseInt(store.get(KEY) || "", 10);
    const hashMode = location.hash === "#present" ? "present" : location.hash === "#presenter" ? "presenter" : "";
    const resumeAt = start < 0 && !hashMode && Number.isFinite(saved) && saved > 1 && saved <= n ? saved : 0;
    show(start >= 0 ? start : 0, { save: false, broadcast: false });
    if (resumeBtn && resumeAt) {
      const num = $(".n", resumeBtn);
      if (num) num.textContent = String(resumeAt);
      resumeBtn.hidden = false;
      resumeBtn.addEventListener("click", () => {
        resumeBtn.hidden = true;
        show(resumeAt - 1);
        try { deck.focus({ preventScroll: true }); } catch (e) { deck.focus(); }
      });
    }
    post({ type: "who" }); // an audience window that is already open answers, so S won't open a second one
    if (hashMode) setMode(hashMode, { quiet: hashMode === "present", fsPrompt: true });
    // The inline keys only work with focus in the deck, so a fresh page starts there.
    else if (start < 0) { try { deck.focus({ preventScroll: true }); } catch (e) { /* focus is optional */ } }
    window.addEventListener("hashchange", () => {
      const k = fromHash();
      if (k >= 0) show(k);
      if (location.hash === "#present") setMode("present", { quiet: true, fsPrompt: true });
      if (location.hash === "#presenter") setMode("presenter");
    });
    window.addEventListener("resize", () => { if (mode !== "inline") { scale(); refitPresenter(); } });
  }
})();
