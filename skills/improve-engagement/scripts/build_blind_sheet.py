#!/usr/bin/env python3
"""Turn several versions of the same items into a blind sheet for reader judges.

Usage:
    python3 build_blind_sheet.py versions.json --sheet OUT/sheet.json --key KEYDIR/key.json [--seed N]

versions.json: {"item-id": {"version-name": {"part-name": "text", ...}, ...}, ...}
Every item needs the same version names. Parts are whatever the reader sees, for
example {"question": "...", "answer": "..."} or {"text": "..."}.

The sheet gives each version a neutral label (X, Y, Z, ...) and shuffles the labels
per item, so a label in one item says nothing about the same label in the next.
The key maps labels back to version names. Write it to a folder no judge is told
about, and never put it beside the sheet. Item ids are replaced with neutral ones
too, in case an id names a version.
"""
import argparse
import json
import random
import sys
from pathlib import Path

LABELS = "XYZWVUTS"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("versions")
    ap.add_argument("--sheet", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--seed", type=int, default=1, help="shuffle seed, so a sheet can be rebuilt")
    a = ap.parse_args()
    try:
        items = json.loads(Path(a.versions).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"could not read {a.versions}: {exc}")
    names = None
    for item_id, versions in items.items():
        if names is None:
            names = sorted(versions)
        elif sorted(versions) != names:
            sys.exit(f"{item_id} has versions {sorted(versions)}, expected {names}")
    if not names or len(names) < 2:
        sys.exit("need at least two versions per item")
    if len(names) > len(LABELS):
        sys.exit(f"at most {len(LABELS)} versions")
    sheet_path, key_path = Path(a.sheet).resolve(), Path(a.key).resolve()
    if key_path.parent == sheet_path.parent:
        sys.exit("the key must not sit in the same folder as the sheet")
    rng = random.Random(a.seed)
    sheet, key = [], {}
    for n, (item_id, versions) in enumerate(items.items(), 1):
        order = names[:]
        rng.shuffle(order)
        neutral = f"item-{n:02d}"
        texts = [json.dumps(versions[v], sort_keys=True) for v in order]
        sheet.append({
            "item": neutral,
            "versions": {LABELS[i]: versions[v] for i, v in enumerate(order)},
            "identical": sorted(LABELS[i] for i, t in enumerate(texts) if texts.count(t) > 1),
        })
        key[neutral] = {"id": item_id, "labels": {LABELS[i]: v for i, v in enumerate(order)}}
    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    key_path.parent.mkdir(parents=True, exist_ok=True)
    sheet_path.write_text(json.dumps(sheet, indent=1, ensure_ascii=False), encoding="utf-8")
    key_path.write_text(json.dumps(key, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(sheet)} items, versions {names}")
    print(f"sheet for judges: {sheet_path}")
    print(f"key, keep away from judges: {key_path}")


if __name__ == "__main__":
    main()
