#!/usr/bin/env python3
"""Tally blind judge results against the key and print which version readers preferred.

Usage:
    python3 tally_blind.py --key KEYDIR/key.json JUDGE.json [JUDGE.json ...] [--scale 5] [--out tally.json]

Each judge file is a JSON list with one object per item:
    {"item": "item-01", "scores": {"X": {"criterion": 4, ...}, "Y": {...}}, "rank": ["Y", "X"], "why": "..."}
Scores are numbers on a 1..SCALE scale. A criterion whose value is a list counts its
length (use it for "violations", where fewer is better, and it is reported as a count).

The tally reports, per version: mean score per criterion across judges and items,
mean rank, and how often it was ranked first. A gap smaller than 6% of the scale is
printed as a tie, because model judges move that much on identical text.
"""
import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

NOISE = 0.06  # share of the scale below which a gap is treated as a tie


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("judges", nargs="+")
    ap.add_argument("--key", required=True)
    ap.add_argument("--scale", type=float, default=5)
    ap.add_argument("--out")
    a = ap.parse_args()
    try:
        key = json.loads(Path(a.key).read_text(encoding="utf-8"))
        judges = {Path(j).stem: json.loads(Path(j).read_text(encoding="utf-8")) for j in a.judges}
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"could not read input: {exc}")
    scores = defaultdict(lambda: defaultdict(list))   # version -> criterion -> values
    counts = defaultdict(lambda: defaultdict(list))   # version -> list criterion -> lengths
    ranks = defaultdict(list)
    firsts = defaultdict(int)
    per_judge_first = defaultdict(lambda: defaultdict(int))
    skipped = 0
    for jname, rows in judges.items():
        for row in rows:
            labels = (key.get(row.get("item")) or {}).get("labels")
            if not labels:
                skipped += 1
                continue
            for label, crit in (row.get("scores") or {}).items():
                version = labels.get(label)
                if version is None:
                    continue
                for c, v in crit.items():
                    if isinstance(v, list):
                        counts[version][c].append(len(v))
                    elif isinstance(v, (int, float)):
                        scores[version][c].append(min(a.scale, max(1, v)))
            rank = [labels[l] for l in row.get("rank") or [] if l in labels]
            for pos, version in enumerate(rank, 1):
                ranks[version].append(pos)
            if rank:
                firsts[rank[0]] += 1
                per_judge_first[jname][rank[0]] += 1
    versions = sorted(set(scores) | set(ranks) | set(counts))
    if not versions:
        sys.exit("no rows matched the key")
    result = {"judges": list(judges), "items": len(key), "rows_skipped": skipped, "versions": {}}
    for v in versions:
        result["versions"][v] = {
            "mean_scores": {c: round(statistics.mean(vals), 2) for c, vals in scores[v].items()},
            "mean_counts": {c: round(statistics.mean(vals), 2) for c, vals in counts[v].items()},
            "mean_rank": round(statistics.mean(ranks[v]), 2) if ranks[v] else None,
            "ranked_first": firsts[v],
        }
    result["ranked_first_by_judge"] = {j: dict(d) for j, d in per_judge_first.items()}
    criteria = sorted({c for v in versions for c in result["versions"][v]["mean_scores"]})
    ties = []
    for c in criteria:
        vals = sorted(((result["versions"][v]["mean_scores"].get(c), v) for v in versions if c in result["versions"][v]["mean_scores"]), reverse=True)
        if len(vals) >= 2 and vals[0][0] - vals[1][0] < NOISE * a.scale:
            ties.append(f"{c}: {vals[0][1]} and {vals[1][1]} are within noise ({vals[0][0]} vs {vals[1][0]})")
    result["ties"] = ties
    print(f"{len(judges)} judge file(s), {len(key)} items, {skipped} rows skipped")
    for v in versions:
        r = result["versions"][v]
        bits = [f"{c} {s}" for c, s in r["mean_scores"].items()] + [f"{c} {s} per item" for c, s in r["mean_counts"].items()]
        print(f"  {v:<12} ranked first {r['ranked_first']:>3}   mean rank {r['mean_rank']}   " + "   ".join(bits))
    for t in ties:
        print("  tie:", t)
    if a.out:
        Path(a.out).write_text(json.dumps(result, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
