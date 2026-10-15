#!/usr/bin/env python3
"""Build a presentable deck page from a deck file.

    python3 build_deck.py deck.json -o deck.html [--published-url URL] [--standalone]

The deck file names the slides (HTML fragments, inline or in files), their speaker notes and
planned minutes. The output is one self-contained HTML page with present mode, presenter view,
the audience window and tab sync from assets/presenter.js. Slide HTML is copied in unchanged.

By default the output is an Artifact page fragment (<title>, head links, <style>, body markup,
<script>), the shape claude.ai wraps in its own document. --standalone adds <!doctype html>,
<html>, <head> and <body> so the file opens correctly from disk.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
ASSETS = SKILL / "assets"
UNSPOKEN = re.compile(r"(If asked|Prompts if|Reminder)")
SLIDE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

warnings: list[str] = []


def warn(msg: str) -> None:
    warnings.append(msg)
    print(f"warning: {msg}", file=sys.stderr)


def esc(s) -> str:
    return html.escape(str(s), quote=True)


def plain(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "")


def md_inline(s: str) -> str:
    out = esc(s)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    return re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)


def load_slide_html(s: dict, base: Path) -> str:
    if s.get("file"):
        p = (base / s["file"]).resolve()
        if not p.exists():
            warn(f"slide {s.get('id')}: file {s['file']} not found")
            return ""
        return p.read_text(encoding="utf-8")
    return s.get("html") or ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("deck", type=Path)
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument("--published-url", default=None,
                    help="the claude.ai artifact URL; overrides published_url in the deck file")
    ap.add_argument("--standalone", action="store_true", help="emit a full HTML document for local use")
    a = ap.parse_args()

    spec = json.loads(a.deck.read_text(encoding="utf-8"))
    base = a.deck.resolve().parent
    title = spec.get("title") or "Slides"
    key = re.sub(r"[^a-z0-9-]+", "-", (spec.get("key") or title).lower()).strip("-") or "deck"
    canvas = spec.get("canvas") or {}
    cw, ch = int(canvas.get("width") or 1280), int(canvas.get("height") or 720)
    published = a.published_url if a.published_url is not None else (spec.get("published_url") or "")
    lo, hi = spec.get("notes_words") or [60, 170]
    slides = spec.get("slides") or []
    if not slides:
        print("error: the deck has no slides", file=sys.stderr)
        return 1

    n = len(slides)
    seen: set[str] = set()
    rendered, meta = [], []
    for i, s in enumerate(slides):
        sid = str(s.get("id") or f"s{i + 1}")
        if not SLIDE_ID.match(sid):
            warn(f"slide {i + 1}: id '{sid}' should match [A-Za-z0-9_-]")
        if sid in seen:
            warn(f"slide {i + 1}: duplicate id '{sid}'")
            sid = f"{sid}-{i + 1}"
        seen.add(sid)
        stitle = plain(s.get("title") or "")
        if not stitle:
            warn(f"slide {sid}: no title (presenter view lists slides by title)")
        notes = s.get("notes") or ""
        spoken = sum(len(p.split()) for p in notes.split("\n\n") if not UNSPOKEN.match(p))
        if not notes:
            warn(f"slide {sid}: no speaker notes")
        elif not s.get("skip_notes_check") and not lo <= spoken <= hi:
            warn(f"slide {sid}: notes are {spoken} spoken words (aim for {lo}-{hi})")
        if s.get("minutes") in (None, ""):
            warn(f"slide {sid}: no planned minutes (pace tracking treats it as 0)")
        body = load_slide_html(s, base)
        hidden = "" if i == 0 else " hidden"
        rendered.append(
            f'<section class="slide" id="slide-{esc(sid)}" data-i="{i}" role="group" '
            f'aria-roledescription="slide" aria-label="{i + 1} of {n}: {esc(stitle)}"{hidden}>'
            f"{body}</section>")
        meta.append({"id": sid, "title": stitle, "notes": notes, "minutes": s.get("minutes")})

    total = sum(float(m.get("minutes") or 0) for m in meta)
    mins = f"{total:.1f} min planned" if total else "timing not set"
    first = meta[0]
    notes0 = "".join(f"<p>{md_inline(p)}</p>" for p in (first["notes"] or "No notes for this slide.").split("\n\n"))
    meta_json = json.dumps(meta, ensure_ascii=False).replace("<", "\\u003c")

    author_css = []
    for rel in spec.get("styles") or []:
        p = (base / rel).resolve()
        if p.exists():
            author_css.append(p.read_text(encoding="utf-8"))
        else:
            warn(f"style file {rel} not found")
    css = (ASSETS / "presenter.css").read_text(encoding="utf-8") + "\n" + "\n".join(author_css)
    js = (ASSETS / "presenter.js").read_text(encoding="utf-8")
    head_extra = "\n".join(spec.get("head") or [])
    subtitle = spec.get("subtitle") or ""

    body = f'''<main class="pd-page">
  <header class="pd-head">
    <h1>{esc(title)}</h1>
    {f'<p class="pd-sub">{esc(subtitle)}</p>' if subtitle else ""}
    <p class="pd-meta">{n} slides · {mins}</p>
    <p class="pd-howto">Press <kbd>P</kbd> or <strong>Present</strong> to show the slides in this window. To present with notes, press <kbd>S</kbd> or <strong>Presenter view</strong>: your notes open here and the link to the slides is copied. Open it in a new window (<kbd>⌘N</kbd>, paste), drag that window to the screen the room sees, and click it once for full screen.</p>
  </header>
  <div class="deck" id="deck" tabindex="0" data-deck-key="{esc(key)}" data-canvas-w="{cw}" data-canvas-h="{ch}" data-published-url="{esc(published)}" aria-label="Slides. Arrow keys move, P presents, N shows notes.">
    <div class="deck-stage" id="deck-stage">
      <div class="deck-canvas" id="deck-canvas">
        {"".join(rendered)}
      </div>
      <button type="button" class="edge edge-prev" data-go="-1" tabindex="-1" aria-hidden="true"><span>‹</span></button>
      <button type="button" class="edge edge-next" data-go="1" tabindex="-1" aria-hidden="true"><span>›</span></button>
      <div class="deck-progress" aria-hidden="true"><span id="deck-bar" style="width:{100 / n:.3f}%"></span></div>
      <div class="deck-black" id="deck-black" hidden></div>
      <button type="button" class="deck-fsprompt" id="deck-fsprompt" hidden><span>Click anywhere for full screen</span></button>
    </div>
    <div class="deck-controls">
      <button type="button" class="btn-deck" data-go="-1" aria-label="Previous slide"><span aria-hidden="true">←</span> Prev</button>
      <p class="deck-count" id="deck-count" aria-live="polite"><span class="cur">01</span> / {n:02d}</p>
      <button type="button" class="btn-deck" data-go="1" aria-label="Next slide">Next <span aria-hidden="true">→</span></button>
      <button type="button" class="btn-deck deck-resume" id="deck-resume" hidden>Resume at slide <span class="n"></span></button>
      <span class="deck-gap"></span>
      <button type="button" class="btn-deck" id="deck-notes-btn" aria-pressed="false" aria-controls="deck-notes">Notes <kbd>N</kbd></button>
      <button type="button" class="btn-deck" id="deck-presenter-btn">Presenter view <kbd>S</kbd></button>
      <button type="button" class="btn-deck is-primary" id="deck-present-btn">Present <kbd>P</kbd></button>
    </div>
    <div class="deck-hud" id="deck-hud" role="toolbar" aria-label="Presentation controls">
      <button type="button" class="hud-btn" data-go="-1" aria-label="Previous slide">←</button>
      <span class="hud-count" id="hud-count"><span class="cur">01</span> / {n:02d}</span>
      <button type="button" class="hud-btn" data-go="1" aria-label="Next slide">→</button>
      <span class="hud-sep" aria-hidden="true"></span>
      <span class="hud-time-wrap"><span class="hud-timer" id="hud-timer" title="Elapsed since you started presenting">00:00</span>
      <span class="hud-sep" aria-hidden="true"></span></span>
      <button type="button" class="hud-btn" id="hud-time" aria-pressed="true">Hide time</button>
      <button type="button" class="hud-btn" id="hud-fs">Full screen</button>
      <button type="button" class="hud-btn" id="hud-help" aria-label="Keyboard shortcuts" aria-controls="deck-help">?</button>
      <button type="button" class="hud-btn" id="hud-exit">Exit <kbd>Esc</kbd></button>
    </div>
    <div class="deck-help" id="deck-help" hidden>
      <p class="help-h">Keyboard</p>
      <dl>
        <dt><kbd>→</kbd> <kbd>Space</kbd> <kbd>PgDn</kbd></dt><dd>next slide</dd>
        <dt><kbd>←</kbd> <kbd>Shift Space</kbd> <kbd>PgUp</kbd></dt><dd>previous slide</dd>
        <dt><kbd>Home</kbd> <kbd>End</kbd></dt><dd>first or last slide</dd>
        <dt>number, then <kbd>Enter</kbd></dt><dd>go to that slide</dd>
        <dt><kbd>B</kbd> <kbd>.</kbd></dt><dd>black screen, and back</dd>
        <dt><kbd>F</kbd></dt><dd>full screen</dd>
        <dt><kbd>T</kbd></dt><dd>hide or show the time</dd>
        <dt><kbd>S</kbd></dt><dd>presenter view, and copy the link for the slides window</dd>
        <dt><kbd>A</kbd></dt><dd>in presenter view: show those steps again</dd>
        <dt><kbd>Esc</kbd></dt><dd>stop presenting</dd>
      </dl>
    </div>
    <p class="deck-toast" id="deck-toast" role="status" hidden></p>
    <div class="deck-notes" id="deck-notes" hidden>
      <p class="notes-meta" id="deck-notes-meta">Slide 01 · {esc(first["title"])}</p>
      <div class="notes-body" id="deck-notes-body">{notes0}</div>
    </div>
  </div>
  <script type="application/json" id="data-slides">{meta_json}</script>
</main>'''

    head = f'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>{esc(title)}</title>\n{head_extra}\n<style>\n{css}\n</style>'
    script = f"<script>\n{js}\n</script>"
    if a.standalone:
        page = f'<!doctype html>\n<html lang="en">\n<head>\n{head}\n</head>\n<body>\n{body}\n{script}\n</body>\n</html>\n'
    else:
        page = f"{head}\n{body}\n{script}\n"
    a.out.write_text(page, encoding="utf-8")
    print(f"wrote {a.out} · {n} slides · {mins} · canvas {cw}x{ch} · key {key}"
          + (f" · published {published}" if published else " · no published URL yet")
          + f" · {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
