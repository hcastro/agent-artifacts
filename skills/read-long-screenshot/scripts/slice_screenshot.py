#!/usr/bin/env python3
"""Slice a tall screenshot into overlapping tiles that vision
models read at full detail instead of downscaling into an unreadable strip.
Tiles run top to bottom; slice a very wide image in column bands with --x-range.

Usage:
    python3 slice_screenshot.py IMAGE [--out DIR] [--x-range X0 X1] [--y-range Y0 Y1]
                                [--overlap PX] [--max-edge PX] [--max-pixels N]
                                [--engine auto|pillow|sips]

Prints one line per tile: "<path>\ty=<top>-<bottom>" in source-image pixels,
then a summary line. With Pillow, tiles that are a single flat color are skipped
and listed as "blank" so they cost no reads; the sips engine writes every tile.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

# Claude's vision input downscales any image whose long edge exceeds 1568 px
# or whose area exceeds ~1,600 tokens (about 1.15 megapixels). Keeping every
# tile under both limits means the model sees it at the pixels we hand it.
DEFAULT_MAX_EDGE = 1568
DEFAULT_MAX_PIXELS = 1_150_000

# Overlap between consecutive tiles, in output pixels. 80 px is roughly two
# lines of body text on a 2x (Retina) capture, so a line cut by one tile edge
# appears whole in the neighbor.
DEFAULT_OVERLAP = 80

# A tile whose grayscale standard deviation is below this is a flat fill
# (page padding, empty footer). Real text on any background scores well above 10.
BLANK_STDDEV = 2.0


def fail(msg, code=1):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def plan_tiles(src_w, src_h, x0, x1, max_edge, max_pixels, overlap):
    """Return (scale, out_w, out_h, tile_h, [(top, bottom) in output px])."""
    crop_w = x1 - x0
    scale = min(1.0, max_edge / crop_w)
    out_w = max(1, round(crop_w * scale))
    out_h = max(1, round(src_h * scale))
    tile_h = min(max_edge, max_pixels // out_w)
    if tile_h <= overlap:
        fail(f"tile height {tile_h}px is not larger than overlap {overlap}px; "
             "lower --overlap or narrow the image with --x-range")
    if out_h <= tile_h:
        return scale, out_w, out_h, out_h, [(0, out_h)]
    # Fewest tiles that keep at least `overlap` px shared between neighbors,
    # spread evenly so the last tile is not a near-duplicate of the one before.
    step = tile_h - overlap
    n = -(-(out_h - tile_h) // step) + 1
    span = out_h - tile_h
    tops = [round(i * span / (n - 1)) for i in range(n)]
    return scale, out_w, out_h, tile_h, [(t, t + tile_h) for t in tops]


def have_pillow():
    try:
        import PIL  # noqa: F401
        return True
    except ImportError:
        return False


def source_size(path, engine):
    if engine == "pillow":
        from PIL import Image
        with Image.open(path) as im:
            return im.size
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path],
                         capture_output=True, text=True)
    if out.returncode != 0:
        fail(f"sips could not read {path}: {out.stderr.strip()}")
    vals = {}
    for line in out.stdout.splitlines():
        parts = line.split(":")
        if len(parts) == 2 and parts[0].strip() in ("pixelWidth", "pixelHeight"):
            vals[parts[0].strip()] = int(parts[1])
    if len(vals) != 2:
        fail(f"{path} does not look like an image sips can read")
    return vals["pixelWidth"], vals["pixelHeight"]


def slice_pillow(path, x0, x1, scale, out_w, out_h, tiles, out_dir, stem):
    from PIL import Image, ImageStat
    with Image.open(path) as im:
        im = im.convert("RGB").crop((x0, 0, x1, im.size[1]))
        if scale < 1.0:
            im = im.resize((out_w, out_h), Image.LANCZOS)
        results = []
        for i, (top, bottom) in enumerate(tiles):
            tile = im.crop((0, top, out_w, bottom))
            if len(tiles) > 1 and ImageStat.Stat(tile.convert("L")).stddev[0] < BLANK_STDDEV:
                results.append((None, top, bottom))
                continue
            dest = os.path.join(out_dir, f"{stem}-{i:02d}.png")
            tile.save(dest)
            results.append((dest, top, bottom))
        return results


def slice_sips(path, x0, x1, scale, out_w, out_h, tiles, out_dir, stem):
    """Fallback for macOS without Pillow. No blank-tile detection.

    sips silently ignores a crop whose box ends exactly on the image's bottom
    or right edge and writes the whole image instead, so every crop here stops
    one pixel short of that edge.
    """
    work = tempfile.mkdtemp(prefix="slice-", dir=out_dir)
    try:
        base = os.path.join(work, "base.png")
        src_w, src_h = source_size(path, "sips")
        cmd = ["sips", "-s", "format", "png", path, "--out", base]
        if x0 != 0 or x1 != src_w:
            crop_w = (x1 - x0) - (1 if x1 == src_w else 0)
            cmd = ["sips", "-s", "format", "png", "-c", str(src_h - 1), str(crop_w),
                   "--cropOffset", "0", str(x0), path, "--out", base]
        run_sips(cmd)
        if scale < 1.0:
            run_sips(["sips", "-z", str(out_h), str(out_w), base, "--out", base])
        base_w, base_h = source_size(base, "sips")
        results = []
        for i, (top, bottom) in enumerate(tiles):
            dest = os.path.join(out_dir, f"{stem}-{i:02d}.png")
            if len(tiles) == 1:
                shutil.copyfile(base, dest)
            else:
                h = min(bottom, base_h - 1) - top
                run_sips(["sips", "-c", str(h), str(base_w - 1),
                          "--cropOffset", str(top), "0", base, "--out", dest])
            results.append((dest, top, bottom))
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return results


def run_sips(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        fail(f"sips failed ({' '.join(cmd)}): {out.stderr.strip()}")


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("image")
    p.add_argument("--out", help="output directory (default: a new temp dir)")
    p.add_argument("--x-range", nargs=2, type=int, metavar=("X0", "X1"),
                   help="keep only source columns X0..X1, e.g. to drop a sidebar")
    p.add_argument("--y-range", nargs=2, type=int, metavar=("Y0", "Y1"),
                   help="keep only source rows Y0..Y1, e.g. to zoom on one region")
    p.add_argument("--overlap", type=int, default=DEFAULT_OVERLAP,
                   help="rows shared by neighboring tiles, in output px (default 80)")
    p.add_argument("--max-edge", type=int, default=DEFAULT_MAX_EDGE,
                   help="longest tile edge in px (default 1568, Claude's long-edge limit)")
    p.add_argument("--max-pixels", type=int, default=DEFAULT_MAX_PIXELS,
                   help="tile area cap in px (default 1150000, Claude's area limit)")
    p.add_argument("--engine", choices=["auto", "pillow", "sips"], default="auto")
    a = p.parse_args()

    path = os.path.expanduser(a.image)
    if not os.path.isfile(path):
        fail(f"no file at {path}")

    engine = a.engine
    if engine == "auto":
        engine = "pillow" if have_pillow() else ("sips" if shutil.which("sips") else None)
    if engine is None:
        fail("Pillow is not installed and sips is unavailable; run: python3 -m pip install pillow")
    if engine == "pillow" and not have_pillow():
        fail("Pillow is not installed; run: python3 -m pip install pillow")

    try:
        src_w, src_h = source_size(path, engine)
    except Exception as e:  # Pillow raises UnidentifiedImageError and friends
        fail(f"could not open {path} as an image: {e}")

    x0, x1 = (0, src_w) if not a.x_range else a.x_range
    if not (0 <= x0 < x1 <= src_w):
        fail(f"--x-range {x0} {x1} must satisfy 0 <= X0 < X1 <= {src_w}")
    ry0, ry1 = (0, src_h) if not a.y_range else a.y_range
    if not (0 <= ry0 < ry1 <= src_h):
        fail(f"--y-range {ry0} {ry1} must satisfy 0 <= Y0 < Y1 <= {src_h}")

    stem = os.path.splitext(os.path.basename(path))[0][:40] or "shot"
    out_dir = os.path.expanduser(a.out) if a.out else tempfile.mkdtemp(prefix=f"slices-{stem[:20]}-")
    os.makedirs(out_dir, exist_ok=True)

    src = path
    rows_dir = None
    try:
        if (ry0, ry1) != (0, src_h):
            # Pre-crop the rows to a temp file so both engines see a smaller image.
            rows_dir = tempfile.mkdtemp(prefix="rows-", dir=out_dir)
            src = os.path.join(rows_dir, "rows.png")
            if engine == "pillow":
                from PIL import Image
                with Image.open(path) as im:
                    im.convert("RGB").crop((0, ry0, src_w, ry1)).save(src)
            else:
                # sips ignores crops that end on the bottom edge; stop 1 px short.
                h = (ry1 - ry0) - (1 if ry1 == src_h else 0)
                run_sips(["sips", "-s", "format", "png", "-c", str(h), str(src_w),
                          "--cropOffset", str(ry0), "0", path, "--out", src])
            crop_h = source_size(src, engine)[1]
        else:
            crop_h = src_h

        scale, out_w, out_h, tile_h, tiles = plan_tiles(
            src_w, crop_h, x0, x1, a.max_edge, a.max_pixels, a.overlap)

        slicer = slice_pillow if engine == "pillow" else slice_sips
        results = slicer(src, x0, x1, scale, out_w, out_h, tiles, out_dir, stem)
    finally:
        if rows_dir:
            shutil.rmtree(rows_dir, ignore_errors=True)

    blank = 0
    for dest, top, bottom in results:
        y0, y1 = ry0 + round(top / scale), min(ry1, ry0 + round(bottom / scale))
        if dest is None:
            blank += 1
            print(f"blank\ty={y0}-{y1}")
        else:
            print(f"{dest}\ty={y0}-{y1}")
    print(f"# source {src_w}x{src_h}, columns {x0}-{x1}, rows {ry0}-{ry1}, scale {scale:.2f}, "
          f"tile {out_w}x{tile_h}, {len(results) - blank} tiles to read, "
          f"{blank} blank skipped, engine {engine}, dir {out_dir}")


if __name__ == "__main__":
    main()
