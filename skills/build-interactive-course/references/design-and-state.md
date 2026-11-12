# Design, storage and sharing

Read this before styling the page or deciding where progress lives.

## Contents

- Design
- Words on the page
- Where progress lives
- Sharing
- Resetting and resuming
- Checking the live page

## Design

The starter kit's look is a working default. Redesign it for the subject.

- **Load a frontend design skill first** and write its design plan: palette, type, layout and the one idea that makes this page this course. Styling from habit produces the card grid every generated page has.
- **Take the idea from the subject's vocabulary.** A course about "tracks" and "stations" became a line map. A course about a kitchen could be a pass with tickets. One strong idea, with everything around it quiet.
- **Take colors from the product** being taught when it has them.
- **Label every indicator.** Dots, rings, bars and badges each get a word that says what they measure. A row of status badges gets a heading per group.
- **Give equal choices equal weight.** Confidence buttons, answer options and filters look the same until the learner picks one.
- **Show the product where you can.** Real captures and real interface recordings teach more than a diagram of them.
- **Check light mode, dark mode and phone width** in screenshots before publishing.

## Words on the page

- **Title the page with what it is.** "The course map" works. Slogans and promises do not.
- **No dated copy.** No countdowns, deadlines, or references to who is leaving and when.
- **One name per thing.** If the map calls it a stop, every screen calls it a stop.
- **Say what a carried-over number means.** A learner who starts above zero should read why on the same screen.
- **Run the interface strings through the learner's style rules**, the same as the questions.

## Where progress lives

The kit stores progress in two places and reads both on load:

| Place | When it is used | What it gives |
|---|---|---|
| A private record per visitor on the host | The host offers per-user storage and the visitor is allowed to write | Progress that follows the person across devices |
| The browser's local storage | Always, as a mirror and as the fallback | Progress on that one browser |

Nothing a learner does is ever stored where another visitor can read it. Do not add shared storage for progress.

When a write to the private record fails, the kit switches to browser-only storage. The Progress page says which one is in use.

## Sharing

On hosts with access levels, check what each level can do before telling the user how to share:

- View-only access usually cannot write, even to the visitor's own private record. Those visitors can take the course, and their progress stays in one browser.
- The level that allows interaction can save to the private record.
- Edit access lets a person change the page. Do not hand it out for a course.

Test it. Act at each level with the host's own tooling, write a probe record, and delete it afterward.

## Resetting and resuming

- **Reset with a marker.** Write a reset marker to a second private record and have the page discard any saved progress that does not carry it. Deleting the progress record alone fails when an open tab writes the old state back.
- **Resume from a private offer.** Starting levels from an earlier tutoring session go into the learner's private record. The page shows the offer only to the person whose record holds it. Starting levels are capped below "independent", because none of them was earned on this page.
- **Seeded questions.** A question the learner left open, or a misconception to re-test, is tagged in the content and queued by the engine when the offer is accepted. To everyone else it is an ordinary question.

## Checking the live page

- Open the published page in a real browser. Check the map, one question, and the Progress page.
- Read the browser console for blocked scripts or fonts. Hosts differ on which outside files a page may load.
- Reload after a publish. An open tab keeps the old code.
