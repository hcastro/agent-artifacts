#!/usr/bin/env python3
"""Apply rewritten prose to the stop files, refusing any field the rewrite could have made wrong.

    python3 merge_prose.py <content_dir> <rewrite_dir> [stop-id ...] [--refused <file>] [--dry-run]

<rewrite_dir>/<stop-id>.json maps item ids to changed fields: {"d1-q03": {"answer": "..."}}.
A field is refused when it loses or gains a code span, a number or a long quotation, grows or shrinks
too much, adds a dash, semicolon, exclamation or curly quote, stops ending as a question, or breaks a
primer, option or owner-line limit. Refused fields keep their old text and are listed in the refused
file (default <rewrite_dir>/refused.json) with the reason, so a person can look at each one.
"""
import argparse
import json
import re
from pathlib import Path

CODE = re.compile(r"`[^`]*`")
NUM = re.compile(r"\d+(?:[.,]\d+)*")
QUOTE = re.compile(r'"[^"]{12,}"')


def check(old, new, key):
    if not isinstance(new, str) or not new.strip():
        return "empty"
    if sorted(CODE.findall(old)) != sorted(CODE.findall(new)):
        return "code spans differ"
    bare_old, bare_new = CODE.sub(" ", old), CODE.sub(" ", new)
    if sorted(NUM.findall(bare_old)) != sorted(NUM.findall(bare_new)):
        return "numbers differ"
    if re.search(r"[—–;!]", bare_new) and not re.search(r"[—–;!]", bare_old):
        return "dash, semicolon or exclamation added"
    if re.search(r"[“”‘’]", bare_new) and not re.search(r"[“”‘’]", bare_old):
        return "curly quotes added"
    ratio = len(new) / max(1, len(old))
    if ratio > 1.45 or ratio < 0.6:
        return "length changed too much (%.2f)" % ratio
    words = len(new.split())
    if key == "primer" and words > 60:
        return "primer over 60 words"
    if key.startswith("options/") and key.endswith("/text") and words > max(27, len(old.split()) + 2):
        return "option too long"
    # owner lines share one opening across a course so they read as a set
    if key == "owner" and new.split()[:3] != old.split()[:3]:
        return "owner line lost its opening"
    if old.rstrip().endswith("?") and not new.rstrip().endswith("?"):
        return "question no longer ends as a question"
    if sorted(QUOTE.findall(bare_old)) != sorted(QUOTE.findall(bare_new)):
        return "quoted speech changed"
    return None


def getf(item, key):
    parts = key.split("/")
    try:
        if parts[0] == "probes":
            return item["probes"][int(parts[1])]
        if parts[0] == "options":
            return next(o for o in item["options"] if o["id"] == parts[1]).get(parts[2])
        if parts[0] == "items":
            return item["items"][int(parts[1])].get(parts[2])
        if parts[0] == "challenge":
            return item["challenge"].get(parts[1])
        return item.get(key)
    except (KeyError, IndexError, ValueError, StopIteration, TypeError):
        return None


def setf(item, key, val):
    parts = key.split("/")
    if parts[0] == "probes":
        item["probes"][int(parts[1])] = val
    elif parts[0] == "options":
        next(o for o in item["options"] if o["id"] == parts[1])[parts[2]] = val
    elif parts[0] == "items":
        item["items"][int(parts[1])][parts[2]] = val
    elif parts[0] == "challenge":
        item["challenge"][parts[1]] = val
    else:
        item[key] = val


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("content_dir", type=Path)
    ap.add_argument("rewrite_dir", type=Path)
    ap.add_argument("stops", nargs="*")
    ap.add_argument("--refused", type=Path)
    ap.add_argument("--dry-run", action="store_true", help="check and report without writing the stop files")
    args = ap.parse_args()
    names = args.stops or sorted(p.stem for p in args.rewrite_dir.glob("*.json") if p.stem != "refused")
    tot = {"applied": 0, "refused": 0, "unknown": 0}
    refused = []
    for name in names:
        src, rew = args.content_dir / f"{name}.json", args.rewrite_dir / f"{name}.json"
        if not rew.exists():
            print(name, "no rewrite file")
            continue
        d = json.loads(src.read_text(encoding="utf-8"))
        new = json.loads(rew.read_text(encoding="utf-8"))
        index = {}
        for key in ("ideas", "questions", "finals", "cards", "open_questions"):
            for it in d.get(key, []):
                index[it["id"]] = it
        applied = rejected = 0
        for iid, fields in new.items():
            it = index.get(iid)
            if it is None:
                tot["unknown"] += 1
                continue
            for k, v in (fields or {}).items():
                old = getf(it, k)
                if not isinstance(old, str):
                    tot["unknown"] += 1
                    continue
                if v == old:
                    continue
                why = check(old, v, k)
                if why:
                    rejected += 1
                    refused.append({"file": name, "id": iid, "field": k, "why": why, "old": old, "new": v})
                    continue
                setf(it, k, v)
                applied += 1
        if not args.dry_run:
            src.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        tot["applied"] += applied
        tot["refused"] += rejected
        print(name, "applied", applied, "refused", rejected)
    out = args.refused or args.rewrite_dir / "refused.json"
    out.write_text(json.dumps(refused, indent=1, ensure_ascii=False), encoding="utf-8")
    print(tot, "refused fields listed in", out)


if __name__ == "__main__":
    main()
