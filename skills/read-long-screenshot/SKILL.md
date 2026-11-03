---
name: read-long-screenshot
description: Reads every detail of a long full-page screenshot, or any very tall or very wide image, by slicing it into overlapping tiles that vision input keeps at full resolution. Use when the user shares a full-page web capture, a scrolling screenshot, a long Slack, chat or email capture, a receipt or a long infographic and asks to read, transcribe, summarize or pull details from it. Also use when an image is more than about twice as tall as it is wide, when its text looks too small or blurry to read, or before ever replying that an image is too long or too large to read.
---

# Read a long screenshot

Vision input shrinks any image to fit about 1568 px on the long edge and about
1.15 megapixels. A 2137x11695 page capture arrives about 290 px wide, and its
text turns to mush. That shrinking is the whole reason agents report "I can't
read this." Slice the image first and read the tiles. Never say an image is
unreadable before slicing it.

## Workflow

Copy this checklist and work through it:

```
- [ ] 1. Get the image's file path
- [ ] 2. Slice it with scripts/slice_screenshot.py
- [ ] 3. Read every tile in order
- [ ] 4. Check for clipped or downscaled text
- [ ] 5. Report in page order
```

**1. Get the file path.** A pasted image shows its path in the message, as
`[Image: source: /path/to/clipboard-....png]`. Use that path. If there is no
path, ask the user to drop or save the file and share its location. When the
source is a live web page you can reach, page-text tools (WebFetch or a browser
`get_page_text`) give exact text more cheaply. Use the screenshot for
what only an image shows, such as screenshots inside the page.

**2. Slice.** Write tiles to the session scratchpad:

```bash
python3 scripts/slice_screenshot.py IMAGE --out <scratchpad>/slices
```

It prints one line per tile, `<path>\ty=<top>-<bottom>`, in source pixels,
then a summary line. With Pillow, flat-color tiles (padding, empty footers)
print as `blank` and need no read. The `sips` engine writes every tile.

**3. Read every tile.** Read every tile path the script printed, in order.
Put up to 20 Read calls in one turn. Don't sample or skip tiles. Neighboring
tiles overlap by about two lines of text, so a line cut at one tile's edge
appears whole in the next.

**4. Check what you saw.**
- **A detail is blurry** (small text inside an embedded screenshot or dialog,
  for example). Zoom in: re-slice only that area with `--y-range Y0 Y1`, using
  the tile's printed y-range, and with `--x-range X0 X1` around the element.
  A narrower crop gets a scale closer to 1.00, shown in the summary line.
  Read the zoomed tiles.
- **All the body text is hard to read.** The summary scale is below about
  0.6, which happens with captures over about 2600 px wide. Re-slice the main
  column with `--x-range`, then the sidebar on its own.
- **The image is much wider than it is tall.** The script tiles top to bottom
  only, so a wide image comes back as one scaled-down strip. Slice it in
  column bands with `--x-range`, about 1568 px wide and overlapping by 80 px
  (for example `0 1568`, then `1488 3056`), and read the bands left to right.
- **The Read result says a tile was "displayed at" a smaller size.** Re-slice
  with `--max-edge` and `--max-pixels` set to fit that size.
- **A line is cut off in the source itself** at the same edge in every tile.
  The original capture clipped it. Say so and quote what is visible. Don't
  fill in the rest.
- Sidebars, banners and footers count as content. Include them.

**5. Report** in the page's top-to-bottom order. Name anything that is clipped
or illegible and give its tile's y-range, so the user can zoom in there.

## Script options

| Flag | Default | Use |
|---|---|---|
| `--out DIR` | new temp dir | Where tiles go. Use the scratchpad. |
| `--x-range X0 X1` | full width | Keep only these source columns, e.g. drop a sidebar or margins. |
| `--y-range Y0 Y1` | full height | Keep only these source rows, e.g. zoom on one region. |
| `--overlap PX` | 80 | Overlap between tiles, in output pixels. |
| `--max-edge PX` | 1568 | Longest tile edge. Lower it if Read reports downscaling. |
| `--max-pixels N` | 1150000 | Tile area cap. |
| `--engine` | auto | `pillow`, or `sips` on macOS without Pillow. |

The script needs `python3` plus Pillow (`python3 -m pip install pillow`). On
macOS it falls back to the built-in `sips` when Pillow is missing. `sips`
writes to the system temp folder, so in a sandbox it fails with
`Cannot write to file`. Rerun it outside the sandbox, or install Pillow.

Delete the tile folder once the report is done.
