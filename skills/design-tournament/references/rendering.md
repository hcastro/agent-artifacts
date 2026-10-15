# Rendering for judges

Judges can only judge what they see. Render every entry with one command into the same set of images, at real sizes, before any judging.

## Render matrix by artifact

| Artifact | Images per entry |
|---|---|
| Logo or mark | Concept sheet (large mark, lockup, true 64, 32 and 16 px; the logo-design skill's `concept_sheet.py`); the mark at 16, 32 and 64 px reversed on the dark background; greyscale only in round 1; colour from round 2; mockups (header, favicon tab, app icon) in the final |
| UI screen or page | 375 px and 1280 to 1440 px full page; a 2x detail crop of the signature area; light and dark; one interaction state (hover, pressed, focus) when it matters |
| Theme or design system | The fixed fixture page at 375 and 1000+ px; a 2x crop of type and a component group; light and dark |
| Data viz | The fixed charts at 375 and 1000 px; a 2x crop of one chart with annotation; dark mode if the product has one |

Use headless Chrome or Playwright for pages and SVG. For marks, the logo-design skill's `render_png.py` picks a renderer.

## Blind sheets

- Copy or render into a per-round `blind/` folder with neutral names (`entry-3.png`), built by a packer step that knows the mapping. The judges' prompt lists only those paths.
- The mapping lives in the orchestrator (the workflow script), never in a file inside a folder a judge can read.
- No concept names, folder IDs or designer notes in what judges see. A one-line idea is fine when the idea is part of what's judged.
- Shuffle the order deterministically per round so a carried entry doesn't hold one position.
