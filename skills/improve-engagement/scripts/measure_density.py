#!/usr/bin/env python3
"""Measure what makes a draft hard to read, so a rewrite can be judged against numbers.

Usage:
    python3 measure_density.py FILE [FILE ...]
    python3 measure_density.py --versions versions.json

FILE is plain text or Markdown. With --versions, the input is the same JSON that
build_blind_sheet.py takes: {"item-id": {"version-name": {"part-name": "text"}}}.
One row of numbers is printed per file or per version. No dependencies.
"""
import argparse
import json
import re
import statistics
import sys

CODE = re.compile(r"`[^`]*`")
ACRONYM = re.compile(r"\b[A-Z]{2,}[0-9]*\b")
NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
# A sentence ends at ., ? or ! followed by a space and a capital, a quote or a backtick.
SPLIT = re.compile(r"(?<=[.?!])\s+(?=[A-Z\"'`(])")
LONG = 30  # words; past this a sentence usually carries more than one idea


def sentences(text):
    out = []
    for block in re.split(r"\n\s*\n", text):
        block = " ".join(block.split())
        if block:
            out.extend(s for s in SPLIT.split(block) if s.strip())
    return out


def measure(texts):
    sents = [s for t in texts for s in sentences(t)]
    if not sents:
        return None
    words = [len(CODE.sub("x", s).split()) for s in sents]
    code = [len(CODE.findall(s)) for s in sents]
    bare = [CODE.sub(" ", s) for s in sents]
    return {
        "words": sum(words),
        "sentences": len(sents),
        "words_per_sentence": round(statistics.mean(words), 1),
        "longest_sentence": max(words),
        "sentences_over_%d_words" % LONG: sum(1 for w in words if w > LONG),
        "code_names_per_sentence": round(statistics.mean(code), 2),
        "sentences_with_3_or_more_code_names": sum(1 for c in code if c >= 3),
        "acronyms_per_sentence": round(statistics.mean(len(ACRONYM.findall(b)) for b in bare), 2),
        "numbers_per_sentence": round(statistics.mean(len(NUMBER.findall(b)) for b in bare), 2),
    }


def show(name, m):
    if m is None:
        print(f"{name}: no sentences found")
        return
    print(name)
    for k, v in m.items():
        print(f"  {k:<38} {v}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--versions", help="JSON file of items, versions and parts")
    ap.add_argument("--json", action="store_true", help="print one JSON object instead of a table")
    a = ap.parse_args()
    if not a.files and not a.versions:
        ap.error("give one or more files, or --versions FILE")
    result = {}
    try:
        for f in a.files:
            with open(f, encoding="utf-8") as fh:
                result[f] = measure([fh.read()])
        if a.versions:
            with open(a.versions, encoding="utf-8") as fh:
                items = json.load(fh)
            by_version = {}
            for parts_by_version in items.values():
                for vname, parts in parts_by_version.items():
                    by_version.setdefault(vname, []).extend(str(t) for t in parts.values())
            for vname, texts in by_version.items():
                result[vname] = measure(texts)
    except (OSError, json.JSONDecodeError, AttributeError) as exc:
        sys.exit(f"could not read input: {exc}")
    if a.json:
        print(json.dumps(result, indent=1))
    else:
        for name, m in result.items():
            show(name, m)


if __name__ == "__main__":
    main()
