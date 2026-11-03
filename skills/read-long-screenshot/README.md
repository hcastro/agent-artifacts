# read-long-screenshot

This skill lets Claude read a full-page screenshot at full detail. It slices the image into overlapping tiles that stay inside Claude's vision limits, reads every tile in page order, and reports what the page says.

Use it for scrolling captures of web pages, long Slack or email threads, receipts, and tall infographics.

## Why tall images are hard to read

Claude's vision input scales down any image whose long edge is over 1568 px or whose area is over about 1.15 megapixels. It keeps the aspect ratio, so a tall capture shrinks to a thin strip.

A 1440x9000 page capture arrives about 250 px wide. At that size body text is a few pixels tall, and the model reports that the image is unreadable.

The skill's script cuts the capture into tiles that each fit inside both limits. Each tile reaches the model at the size the script wrote it, so the text stays sharp. Neighboring tiles overlap, so a line cut at one tile's edge appears whole in the next.

## Before you begin

The script needs Python 3 and one image engine:

- **Pillow.** Install it with `python3 -m pip install pillow`. Pillow works on every platform and skips blank tiles.
- **`sips`.** macOS includes `sips`, and the script falls back to it when Pillow is missing.

## Install the skill

To install the skill for Claude Code, clone the repository and link the skill into your skills folder:

```bash
git clone https://github.com/hcastro/agent-artifacts.git
mkdir -p ~/.claude/skills
ln -s "$PWD/agent-artifacts/skills/read-long-screenshot" ~/.claude/skills/read-long-screenshot
```

The link keeps the skill current when you run `git pull` in the clone. For other install locations, see [Install a skill](../../README.md#install-a-skill).

## Use the skill

Share a long screenshot with Claude and ask about it, for example "Summarize this page capture" or "Transcribe this Slack thread." The skill triggers on its own for long captures and for any image more than about twice as tall as it is wide.

Claude then follows the workflow in [`SKILL.md`](SKILL.md): it slices the image, reads every tile, zooms in on any area that's still blurry, and reports in top-to-bottom order.

### Run the script yourself

The script also works on its own. To slice a capture into a `slices` folder, run the script from the skill folder with the image path:

```bash
python3 scripts/slice_screenshot.py pricing-page.png --out slices
```

The script prints one line per tile with the tile's path and its rows in the source image. A tile of one flat color prints as `blank` and isn't written. The last line is a summary.

The output is similar to the following:

```
slices/pricing-page-00.png	y=0-798
slices/pricing-page-01.png	y=684-1482
slices/pricing-page-02.png	y=1367-2165
...
slices/pricing-page-11.png	y=7518-8316
blank	y=8202-9000
# source 1440x9000, columns 0-1440, rows 0-9000, scale 1.00, tile 1440x798, 12 tiles to read, 1 blank skipped, engine pillow, dir slices
```

In the summary, `scale` is the factor the script applied to fit the width. A scale of `1.00` means no detail was lost. A scale below about `0.6` means the capture is wide enough that body text gets small. In that case, slice the main column with `--x-range`.

To zoom in on one region, pass the rows from a tile's `y=` range and the columns around the element:

```bash
python3 scripts/slice_screenshot.py pricing-page.png --out zoom --y-range 2050 2848 --x-range 0 700
```

## Options

The following table lists the script's options. To print them from the script, run `python3 scripts/slice_screenshot.py --help`.

| Option | Default | Purpose |
|---|---|---|
| `IMAGE` | Required | Path to the PNG, JPEG, or other image to slice. |
| `--out DIR` | A new temp folder | Folder for the tiles. |
| `--x-range X0 X1` | Full width | Keep only source columns `X0` to `X1`, for example to drop a sidebar. |
| `--y-range Y0 Y1` | Full height | Keep only source rows `Y0` to `Y1`, for example to zoom on one region. |
| `--overlap PX` | `80` | Rows shared by neighboring tiles, in output pixels. 80 px is about two lines of text on a 2x capture. |
| `--max-edge PX` | `1568` | Longest tile edge, matching Claude's long-edge limit. |
| `--max-pixels N` | `1150000` | Largest tile area, matching Claude's area limit. |
| `--engine` | `auto` | `pillow`, or `sips` on macOS. `auto` picks Pillow when it's installed. |

If Claude reports that a tile was displayed at a smaller size, lower `--max-edge` and `--max-pixels` to fit that size.

## Limits

- The script tiles from top to bottom only. A capture that is much wider than it is tall gets one scaled-down strip. To read one, slice it in column bands with `--x-range`, about 1568 px wide and overlapping by 80 px (for example `0 1568`, then `1488 3056`), and read them left to right.
- Each tile costs about 1,500 input tokens, so a 12-tile capture costs about 18,000 tokens.
- The `sips` engine doesn't detect blank tiles.
- `sips` writes to the system temp folder. Inside the Claude Code sandbox it fails with `Cannot write to file`. Install Pillow, or run the script outside the sandbox.
- Slicing recovers detail that downscaling hid. It can't recover text that the original capture clipped or rendered too small.
