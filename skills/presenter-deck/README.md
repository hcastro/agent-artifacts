# presenter-deck

This skill turns a set of HTML slides into one page you can present to a room. The page has a present mode, a presenter view with the current and next slide, speaker notes, a clock, a timer, and pace against your plan. An audience window on a second screen follows the presenter. Keyboard shortcuts and presentation clickers both work.

The skill covers presenting only. What the slides say and how they look come from you or another skill.

## Before you begin

To use the skill, you need the following:

- Python 3, to build the deck.
- Optional: Node.js with Playwright and Chromium, to check the deck before you present it. To install them, run `npm i -g playwright && npx playwright install chromium`.
- Optional: A hosting service to share the deck at a link. You can also open the standalone HTML file from disk.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `presenter-deck`.

## Use the skill

Ask for a deck you can present. The following requests trigger the skill:

- "Make these slides presentable with speaker notes and a presenter view."
- "I'm giving the quarterly readout on a projector tomorrow. Set up the deck so my notes stay on my laptop."
- "Add a timer and pace tracking to this deck for a 20-minute talk."

The agent collects each slide's HTML, title, planned minutes, and speaker notes into a deck file. It builds the page, checks it, publishes it, and gives you the link with the presenting steps.

## Build the deck yourself

To build a deck file into a page you can open from disk, run the build script from the skill folder:

```bash
python3 scripts/build_deck.py deck.json -o deck.html --standalone
```

The script warns about missing notes, notes outside the word range, missing minutes, and duplicate slide IDs. For the deck file format, see the "Deck file" section of [`SKILL.md`](SKILL.md).

To check the page and save a screenshot of each slide, run the following command:

```bash
node scripts/check_deck.mjs deck.html --shots shots/
```

The check reports console errors and content that runs past the slide canvas, and tests present mode, presenter view, and the audience window.

## Present the deck

To present on one screen, open the link and press <kbd>P</kbd>. Press <kbd>Esc</kbd> to stop.

To keep your notes on your laptop and show the slides on the room's screen, follow these steps:

1. Open the link and press <kbd>S</kbd>. Presenter view opens and copies the slides link.
1. Press <kbd>⌘N</kbd> (<kbd>Ctrl N</kbd> on Windows and Linux) for a new window in the same browser, paste the link, and press <kbd>Return</kbd>.
1. Drag that window to the room's screen and click it once. It goes full screen on that monitor.
1. Present from the presenter window. Its audience button shows a green dot after the two windows connect.

Set your displays to extend the desktop, not mirror it. Both windows must be in the same browser and profile. For the full list of shortcuts, press <kbd>?</kbd> in present mode or see [`SKILL.md`](SKILL.md).

## Contents

The skill folder holds the following files:

- `SKILL.md`: the workflow, deck file format, speaker note conventions, presenting steps, and gotchas.
- `assets/presenter.js`: the runtime for present mode, presenter view, the audience window, sync, and the timer.
- `assets/presenter.css`: styles for the page and presenter controls. It never styles slide content.
- `scripts/build_deck.py`: builds a deck file into one HTML page.
- `scripts/check_deck.mjs`: checks for overflow, console errors, and the presenting features, and saves optional screenshots.
