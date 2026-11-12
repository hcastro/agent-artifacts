# Design, progress and sharing

Read this before styling the page, before telling anyone how to share it, and before calling a build done.

## Contents

- Design
- Words on the page
- Where progress lives
- Sharing
- Checking the built file

## Design

The starter kit's look is a working default. Redesign it for the subject.

- **Load a frontend design skill first** when one is installed, and write the design plan it asks for: palette, type, layout and the one idea that makes this page this course. Styling from habit produces the card grid every generated page has.
- **Take the idea from the subject's vocabulary.** A course about "tracks" and "stations" became a line map. A course about a kitchen could be a pass with tickets. One strong idea, with everything around it quiet.
- **Take colors from the product** being taught when it has them. Change the tokens at the top of `build/head.html` first.
- **Choose components by the reasoning each idea needs.** See [components.md](components.md). Invent one when the subject has a natural interaction the catalog lacks.
- **Label every indicator.** Dots, rings, bars and badges each get a word that says what they measure. A row of status badges gets a heading per group.
- **Give equal choices equal weight.** Confidence buttons, answer options, "Got it" and "Not yet", and filters look the same until the learner picks one.
- **Show the product where you can.** Real captures and real output teach more than a diagram of them. Embed images as `data:` URLs so the file stays self-contained.
- **Keep the page offline.** It makes no outside requests. The type uses fonts the reader's system already has. Embed a font only when you have the right to, as an `@font-face` rule with a `data:` URL. The build warns about anything in `head.html` that reaches the network.
- **Check light mode, dark mode and phone width** in screenshots before handing the file over.

## Words on the page

- **Title the page with what it is.** "The course map" works. Slogans and promises do not.
- **No dated copy.** No countdowns, deadlines, or references to who is leaving and when.
- **One name per thing.** If the map calls it a stop, every screen calls it a stop.
- **Say what a carried-over number means.** A learner who starts above zero reads why on the same screen.
- **Run the interface strings through the learner's style rules**, the same as the questions.

## Where progress lives

Progress never leaves the learner's browser unless the learner moves it.

| Place | What it holds | How it moves |
|---|---|---|
| The browser's local storage, under the course's `storage_key` | Everything: levels, history, cards and notes on open questions | It saves by itself and stays in that browser |
| A progress file | The same state, a summary and the save block, as JSON | "Download progress" saves it, and "Load progress" reads it |
| The save block | Plain text with levels, misses and the full state encoded | "Copy save block" copies it, and pasting it restores it |

Some browsers give every file opened from disk one shared storage area, so give each course its own `storage_key`. Change it when a new version should not read old progress.

When the browser blocks storage, as some private windows do, the page keeps progress only for the open tab and says so on the Progress page.

"Erase progress" clears local storage and starts over. Starting levels from earlier tutoring arrive only in a progress file or a save block the learner loads. Nothing learner-specific is ever written into the content or the built file. See [tutor-rules.md](tutor-rules.md) for both formats.

## Sharing

The course is one file, `course.html`. Share it like any file:

- **Send it** by chat, email or a shared drive. It opens from disk in any modern browser.
- **Host it** on any static host or file server, with no build step and no server code.

Each person's progress stays in their own browser. Nobody sees anyone else's answers, and there is nothing to configure. A person who switches devices downloads a progress file on one and loads it on the other.

A rebuilt file keeps working with saved progress as long as the `storage_key` stays the same. Stops can be added or removed, and saved progress for a stop that no longer exists is ignored.

## Checking the built file

- **Open it from disk.** Open `course.html` by its `file://` path. Check the map, one question in each format the course uses, and the Progress page.
- **Read the browser console.** It should be empty. An error there is a bug, and a blocked request means something still reaches the network.
- **Run the learner test** against the file: `node scripts/learner_test.mjs --file <dir>/course.html --playwright <dir> --shots <dir>`. It fails on console errors, outside requests and sideways scroll at 390 px.
- **Look at its screenshots** at desktop and phone width, and check dark mode by hand. Full-page screenshots can drop animated elements, so check a viewport capture before chasing a missing line.
- **Reload after every rebuild.** An open tab keeps the old file.
