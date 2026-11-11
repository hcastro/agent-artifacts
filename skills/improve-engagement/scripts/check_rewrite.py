#!/usr/bin/env python3
"""Check a rewrite against its original for the changes a script can see.

Usage:
    python3 check_rewrite.py versions.json --base original --new rewrite [--max-growth 1.6] [--strict-code]

versions.json: {"item-id": {"version-name": {"part-name": "text"}}}, the same file
build_blind_sheet.py takes.

For every part of every item it reports:
  - a code span (text in backticks) in the rewrite that the original did not have
  - a number in the rewrite that the original did not have
  - quoted speech ("...") of three words or more that changed or disappeared
  - a part that grew past --max-growth times its original length, or shrank below half
  - with --strict-code, a code span the original had and the rewrite dropped
Exit code 0 means nothing was found, 1 means at least one finding, 2 means bad input.
It cannot see a changed meaning. A reader agent does that in the fidelity check.
"""
import argparse
import json
import re
import sys
from pathlib import Path

CODE = re.compile(r"`[^`]*`")
NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
QUOTE = re.compile(r'"([^"]+)"')


def findings(old, new, max_growth, strict_code):
    out = []
    old_code, new_code = CODE.findall(old), CODE.findall(new)
    added = sorted(set(new_code) - set(old_code))
    if added:
        out.append("new code span: " + ", ".join(added))
    if strict_code:
        dropped = sorted(set(old_code) - set(new_code))
        if dropped:
            out.append("dropped code span: " + ", ".join(dropped))
    old_bare, new_bare = CODE.sub(" ", old), CODE.sub(" ", new)
    nums = sorted(set(NUMBER.findall(new_bare)) - set(NUMBER.findall(old_bare)))
    if nums:
        out.append("new number: " + ", ".join(nums))
    old_q = [q for q in QUOTE.findall(old_bare) if len(q.split()) >= 3]
    new_q = set(QUOTE.findall(new_bare))
    lost = [q for q in old_q if q not in new_q]
    if lost:
        out.append("quoted speech changed: " + " | ".join(q[:60] for q in lost))
    ratio = len(new) / max(1, len(old))
    if ratio > max_growth:
        out.append("grew %.2f times" % ratio)
    elif ratio < 0.5:
        out.append("shrank to %.2f of the original" % ratio)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("versions")
    ap.add_argument("--base", required=True)
    ap.add_argument("--new", required=True)
    ap.add_argument("--max-growth", type=float, default=1.6)
    ap.add_argument("--strict-code", action="store_true")
    a = ap.parse_args()
    try:
        items = json.loads(Path(a.versions).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"could not read {a.versions}: {exc}", file=sys.stderr)
        sys.exit(2)
    total = changed = 0
    for item_id, versions in items.items():
        if a.base not in versions or a.new not in versions:
            print(f"{item_id}: missing version {a.base} or {a.new}", file=sys.stderr)
            sys.exit(2)
        for part, old in versions[a.base].items():
            new = versions[a.new].get(part)
            if not isinstance(old, str) or not isinstance(new, str):
                continue
            if old != new:
                changed += 1
            for f in findings(old, new, a.max_growth, a.strict_code):
                total += 1
                print(f"{item_id} / {part}: {f}")
    print(f"{changed} parts changed, {total} findings")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
