---
name: presenter-deck
description: Turn a set of slides into a page you can present to a room, with present mode, a presenter view (current and next slide, speaker notes, clock, timer, pace), an audience window on a second screen that follows the presenter, and keyboard and clicker controls. Use when the user wants to present slides to a group, give a talk or a spike readout from a deck, wants presenter notes or a presenter view, needs the slides on a projector or second monitor, or asks for a presentable deck. Covers the presenting mechanics only. It takes slide HTML from anywhere and does not decide how slides look.
---

# Presenter deck

This skill packages a presenting runtime that was built for, and refined during, a real team talk. It covers how a deck gets presented. What the slides say and how they look come from the user, another skill or the deck author, and the runtime treats each slide as opaque HTML on a fixed canvas.

**Done when:** the deck is built, `check_deck.mjs` passes, the page is published with its own URL baked in, and the user has the link plus the presenting steps.

## What the runtime gives

- **Inline view** on the page: prev and next, a slide counter, a notes panel (<kbd>N</kbd>), and "Resume at slide N" after a reload.
- **Present mode** (<kbd>P</kbd> or the Present button): the deck fills the window at the canvas aspect ratio and asks for full screen. It still works when full screen is refused. A control bar with the count and timer hides itself, and the cursor hides while idle.
- **Presenter view** (<kbd>S</kbd>): the current and next slide, the notes with the `Say:` line enlarged, the clock, an elapsed timer, pace against the planned minutes, a go-to list, and the audience status ("Audience window on slide 04", "Waiting for the audience window", "No audience window").
- **Audience window:** a second window in present mode that follows presenter view, slide changes and black screen included, over `BroadcastChannel` with a `localStorage` fallback. Every window shows the same timer. The audience window starts with the time hidden.
- **Entry points:** `#present`, `#presenter` and `#slide-<id>` deep links.

## Workflow

1. **Collect the slides.** Each slide is an HTML fragment drawn on a fixed canvas, 1280x720 by default. Get the HTML, a title, planned minutes and speaker notes for each one. If the slides exist in another format, convert each one to an HTML fragment. Keep any slide-specific CSS in the deck's own stylesheet, never in this skill's assets.
2. **Write the deck file** (schema below) next to the slides, in a folder that outlives the session. A workbench or project folder works. The scratchpad does not survive the session.
3. **Write speaker notes** to the conventions below.
4. **Build a local copy and check it:**
   ```
   python3 scripts/build_deck.py deck.json -o deck-local.html --standalone
   node scripts/check_deck.mjs deck-local.html --shots shots/
   ```
   `build_deck.py` warns about missing notes, notes outside the word range, missing minutes and duplicate ids. `check_deck.mjs` reports console errors and anything that runs past the canvas. It also tests present mode, presenter view and the audience tab end to end. It needs Playwright and runs outside the sandbox, because Chromium needs a mach port. Look at the shots before publishing.
5. **Publish in two passes.** The audience link has to be the page's own claude.ai URL, so:
   - Build without `--standalone` and publish the file as a new Artifact.
   - Put the returned URL in `published_url`, rebuild to the same path, and publish again. The URL stays the same.
   New artifacts are private, so the user has to share the page before anyone else can open it.
6. **Give the user the link and the presenting steps** (below). Name the shortcuts they need on the day.
7. **Share copy, when asked:** use the PNGs from `--shots` (rendered at canvas size, `--scale 2` for sharper images). Assemble them into a PDF or a PowerPoint file with one full-bleed image per slide and no notes. Say that the text can't be edited and links don't click.

## Deck file

```json
{
  "title": "Quarterly Review",
  "subtitle": "optional line under the page title",
  "key": "quarterly-review",
  "canvas": { "width": 1920, "height": 1080 },
  "published_url": "",
  "head": ["<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=...\">"],
  "styles": ["slides.css"],
  "notes_words": [60, 170],
  "slides": [
    { "id": "cover", "title": "Where we are", "minutes": 1,
      "notes": "Say: ...\n\nPurpose: ...", "html": "<div>...</div>" },
    { "id": "numbers", "title": "The numbers", "minutes": 1.5, "notes": "...", "file": "slides/numbers.html" }
  ]
}
```

- `key` namespaces the timer, the saved slide and the sync channel. Give every deck its own key, because all local files share one origin and would drive each other.
- `canvas` is the size the slide HTML was written for. The runtime scales it to fit every view.
- `html` or `file` holds the slide's markup. It is inserted unchanged inside `<section class="slide">`, which is absolutely positioned at the canvas size. Paths in `file` and `styles` are relative to the deck file.
- `head` lines go into the page head as written. Artifact pages may load stylesheets only from Google Fonts and scripts only from the allowed CDNs.
- Add `data-no-advance` to any clickable element on a slide, such as a lightbox. Otherwise a click in present mode advances the slide.
- `skip_notes_check: true` on a slide turns off the word-range warning for that slide, such as a questions slide.

## Speaker notes

- Paragraphs are separated by a blank line. A single line break inside a paragraph shows as a line break, so a reminder can list steps.
- A paragraph can start with a label: `Say:`, `Purpose:`, `Evidence:`, `Limit:`, `Next:`, `Reminder:`, `If asked <topic>:` or `Prompts if the room is quiet:`. Presenter view enlarges the `Say:` paragraph and colors the labels.
- Write the `Say:` paragraph for speaking aloud, and end it with the bridge to the next slide.
- `If asked`, `Prompts if` and `Reminder` paragraphs are backup, and they don't count toward the 60 to 170 spoken words per slide.
- Inline `` `code` `` and `**bold**` render. Anyone with the link can read the notes, so they hold nothing that can't be shared.
- Planned minutes drive the pace chip. It compares elapsed time with when the current slide was planned to start, and says "behind plan" or "ahead of plan" once the two are more than 45 seconds apart.

## Presenting steps for the user

**One screen:** open the link and press <kbd>P</kbd> or click Present. Press <kbd>Esc</kbd> to stop. In full screen, the first <kbd>Esc</kbd> leaves full screen and the second stops presenting.

**Notes on your laptop, slides on the room's screen:**

1. Open the link and press <kbd>S</kbd>. Presenter view opens and the slides link is copied.
2. Press <kbd>⌘N</kbd> for a new window in the same browser, paste the link and press Return.
3. Drag that window to the screen the room sees and click it once. It goes full screen on that monitor.
4. Present from the presenter window. The audience button in its header shows a green dot and "Audience window on slide NN" once the two windows are connected. Press <kbd>A</kbd> to see the steps again.

The displays must be set to extend the desktop. If they mirror, change it in System Settings → Displays.

| Key | Does |
| --- | --- |
| <kbd>→</kbd> <kbd>Space</kbd> <kbd>PgDn</kbd>, a click on the slide | next slide (clickers send PgDn) |
| <kbd>←</kbd> <kbd>Shift Space</kbd> <kbd>PgUp</kbd> | previous slide |
| <kbd>Home</kbd> <kbd>End</kbd> | first or last slide |
| a number, then <kbd>Enter</kbd> | go to that slide |
| <kbd>B</kbd> or <kbd>.</kbd> | black screen, and back |
| <kbd>F</kbd> | full screen |
| <kbd>T</kbd> | hide or show the time in this window |
| <kbd>S</kbd> | presenter view, and copy the slides link |
| <kbd>A</kbd> | in presenter view, the audience window steps |
| <kbd>N</kbd> | inline notes panel |
| <kbd>?</kbd> | shortcut sheet in present mode |
| <kbd>Esc</kbd> | close the sheet or panel, then stop presenting (in full screen, the first press leaves full screen) |

## Gotchas

These came from presenting a real talk with this runtime.

- **claude.ai blocks a window the page opens itself.** The published page runs in a sandboxed frame, and a window it opens inherits the sandbox. claude.ai refuses to load inside it, which shows as `ERR_BLOCKED_BY_RESPONSE`. On a published page, <kbd>S</kbd> therefore copies the link, and the presenter opens the window with <kbd>⌘N</kbd>. A local file still opens the window directly. The runtime treats a page as framed when `published_url` is set and the page isn't a local file. Set `window.__deckFramed = true` to force that behavior.
- **A local test can't catch the frame problem.** `check_deck.mjs` runs from a file, which has no frame. After a change to the presenting code, open the published link in two real windows and confirm that the audience button shows the green dot.
- **On a three-monitor setup, <kbd>S</kbd> alone didn't put the slides on another screen.** A popup can't land on another monitor unless the browser grants window management, and some setups mirror displays. The fix was the audience window with drag-and-click-once steps, plus the extend-not-mirror note in the panel. Locally, "Find my screens" uses `getScreenDetails` when the browser allows it.
- **Both windows must be in the same browser and profile.** Sync uses `BroadcastChannel` and `localStorage`, and both are per profile and per origin. A window in another browser, or in a private window, never connects.
- **Only a key press or a click may open a window.** The `#presenter` deep link opens presenter view without the audience window. Press <kbd>A</kbd> there.
- **The timer belongs to the presenter.** Opening the audience window never starts it. It starts from <kbd>P</kbd> or the presenter's Start timer button, and it survives a reload. Use Reset in presenter view before the talk if a rehearsal left time on it.
- **The audience window hides the time,** so the room never sees the clock. <kbd>T</kbd> shows it in that window only.
- **The audience link needs the second publish.** With an empty `published_url`, the page doesn't know it's framed: <kbd>S</kbd> tries to open a window on its own frame URL, which claude.ai blocks, and no link gets copied.
- **Each publish is its own step.** Republishing after edits updates the same URL. Tell the user that an open audience window needs a reload to pick up new slides.

## Files

- `assets/presenter.js`: the runtime. It covers modes, keys, presenter view, the audience window, sync, the timer and pace. A change here needs a two-window test on the published page.
- `assets/presenter.css`: the page and console chrome only. It never styles slide content.
- `scripts/build_deck.py`: deck file to one HTML page. Use `--standalone` for local files, and `--published-url` to override the deck file.
- `scripts/check_deck.mjs`: overflow, console errors and the presenting mechanics, plus optional PNG shots.
