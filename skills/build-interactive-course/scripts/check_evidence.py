#!/usr/bin/env python3
"""Report course evidence that no longer matches its sources.

    python3 check_evidence.py <course_dir> --root <sources_dir> [--root <another>]

Reads every stop file in <course_dir>/content. For each `evidence` line on a question or final, and
each `source` on a card or open question, it finds references shaped like `path:line` or
`path:start-end` and looks the path up under each --root in the order given. It reports a file that
no longer exists, a line past the end of the file, and a range that runs backward.

A reference only names lines, so a clean report means every cited line still exists. It does not mean
the line still says what the course claims. Re-read the cited lines when the sources have changed.

Exit code 0 when every reference resolves, 1 when anything is stale, 2 on bad arguments.
Standard library only.
"""
import argparse
import json
import re
import sys
from pathlib import Path

# A path needs a slash or a file extension, so "section 1.2" or "10:30" is not read as a reference.
REF = re.compile(r"(?P<path>(?:[\w.-]+/)*[\w.-]+\.[A-Za-z0-9]+|(?:[\w.-]+/)+[\w.-]+):(?P<a>\d+)(?:-(?P<b>\d+))?")


def references(stop):
    """Yields (item id, field, text) for every evidence line and source in one stop file."""
    for key in ("questions", "finals"):
        for q in stop.get(key) or []:
            for e in q.get("evidence") or []:
                yield q.get("id", "?"), "evidence", str(e)
    for key in ("cards", "open_questions"):
        for c in stop.get(key) or []:
            if c.get("source"):
                yield c.get("id", "?"), "source", str(c["source"])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("course_dir", type=Path)
    ap.add_argument("--root", type=Path, action="append", required=True, help="a folder the references are relative to. Repeat for more.")
    args = ap.parse_args()
    content = args.course_dir / "content"
    if not content.is_dir():
        print(f"{content} is not a folder", file=sys.stderr)
        sys.exit(2)
    roots = [r.resolve() for r in args.root]
    for r in roots:
        if not r.is_dir():
            print(f"--root {r} is not a folder", file=sys.stderr)
            sys.exit(2)

    lengths = {}

    def find(rel):
        for r in roots:
            p = (r / rel).resolve()
            if p.is_file():
                if p not in lengths:
                    with p.open("rb") as fh:
                        data = fh.read()
                    # a final line without a newline still counts as a line
                    lengths[p] = data.count(b"\n") + (1 if data and not data.endswith(b"\n") else 0)
                return p
        return None

    stale, checked, skipped = [], 0, 0
    for path in sorted(content.glob("*.json")):
        try:
            stop = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            stale.append(f"{path.name}: invalid JSON ({exc})")
            continue
        for item, field, text in references(stop):
            refs = list(REF.finditer(text))
            if not refs:
                skipped += 1
                continue
            for m in refs:
                checked += 1
                rel, a = m.group("path"), int(m.group("a"))
                b = int(m.group("b") or a)
                where = f"{path.stem} {item} {field} {m.group(0)}"
                found = find(rel)
                if not found:
                    stale.append(f"{where}: file not found under any root")
                elif b < a:
                    stale.append(f"{where}: range runs backward")
                elif a < 1:
                    stale.append(f"{where}: lines start at 1")
                elif b > lengths[found]:
                    stale.append(f"{where}: line {b} is past the end of the file ({lengths[found]} lines)")

    print(f"checked {checked} reference(s) across {len(list(content.glob('*.json')))} stop file(s), skipped {skipped} line(s) with no path:line")
    for s in stale:
        print("  stale", s)
    if stale:
        print(f"{len(stale)} stale reference(s)")
        sys.exit(1)
    print("no stale references")


if __name__ == "__main__":
    main()
