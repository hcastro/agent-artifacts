#!/usr/bin/env python3
"""Validate a course and build its page.

    python3 build_course.py <course_dir> [--out <dir>]

<course_dir> holds course.json, content/<stop-id>.json, build/head.html and js/*.js.
The output folder gets index.html (the page body the publisher wraps in a document),
preview.html (the same page in a full document, for local testing), js/ and data/content.json.

Every problem is printed. Errors break the page or drop authored work, and make the exit code 1.
Warnings leave the page working but weaken it, such as a level nobody can earn.
Standard library only.
"""
import argparse
import html
import json
import shutil
import sys
import time
from pathlib import Path

FORMATS = ("choice", "multi", "order", "bucket", "text")
TYPES = ("predict", "explain", "flaw", "apply", "connect", "teach")
RELS = ("owner", "useful", "mechanics")
RESUME = ("open", "misconception")
SCRIPTS = ("engine", "util", "fx", "tutor", "learn", "views", "main")

BODY = """
<div class="app" id="app">
  <header class="top"><div class="top-in" id="top-in">
    <div class="brand"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="5"/></svg>{title}</div>
  </div></header>
  <main id="view"><div class="loading"><div class="ring-spin"></div><p>Loading the course and your progress.</p></div></main>
  <nav class="tabbar" id="tabbar" aria-label="Sections"></nav>
</div>
"""

# the same skeleton the publisher wraps a page in, so a local preview behaves like the published page
PREVIEW = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
           '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
           '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>'
           '</head><body>{page}</body></html>')


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def error(self, where, msg):
        self.errors.append(f"{where}: {msg}")

    def warn(self, where, msg):
        self.warnings.append(f"{where}: {msg}")


def load_json(path, rep):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        rep.error(path.name, "file missing")
    except json.JSONDecodeError as exc:
        rep.error(path.name, f"invalid JSON ({exc})")
    return None


def check_course(course, rep):
    for key in ("title", "topic", "lines", "storage_key"):
        if not course.get(key):
            rep.error("course.json", f"missing `{key}`")
    if course.get("target_level", 4) not in (4, 5):
        rep.error("course.json", "`target_level` must be 4 or 5")
    lines = course.get("lines") or []
    if not 1 <= len(lines) <= 4:
        rep.error("course.json", f"{len(lines)} lines, the page supports 1 to 4")
    seen = set()
    for line in lines:
        lid = line.get("id")
        if not lid or not line.get("name"):
            rep.error("course.json", "every line needs `id` and `name`")
            continue
        stops = line.get("stops") or []
        if not 3 <= len(stops) <= 10:
            rep.error(f"line {lid}", f"{len(stops)} stops, the map supports 3 to 10")
        ids = []
        for st in stops:
            sid = st.get("id")
            if not sid or not st.get("name"):
                rep.error(f"line {lid}", "every stop needs `id` and `name`")
                continue
            if sid in seen:
                rep.error(f"line {lid}", f"stop id {sid} is used twice")
            seen.add(sid)
            ids.append(sid)
        for pid in line.get("placement") or []:
            if pid not in ids:
                rep.error(f"line {lid}", f"placement names {pid}, which is not a stop on this line")
    standings = course.get("standings") or []
    if not standings:
        rep.warn("course.json", "no `standings`, so every learner shows as New")
    elif any(not (isinstance(s, list) and len(s) == 2) for s in standings) or standings[0][0] != 0:
        rep.error("course.json", "`standings` must be [percent, name] pairs starting at 0")
    elif [s[0] for s in standings] != sorted(s[0] for s in standings):
        rep.error("course.json", "`standings` must rise in percent")
    return [st["id"] for line in lines for st in (line.get("stops") or []) if st.get("id")]


def check_question(q, ideas, rep, final=False):
    """Returns True when the question can be shown. Anything that cannot is an error."""
    qid = q.get("id") or "(question without id)"
    ok = True
    for key in ("id", "idea", "prompt", "answer"):
        if not q.get(key):
            rep.error(qid, f"missing `{key}`")
            ok = False
    fmt = q.get("format", "text" if final else None)
    if fmt not in FORMATS:
        rep.error(qid, f"unknown format {fmt!r}")
        return False
    if q.get("type", "apply" if final else None) not in TYPES:
        rep.error(qid, f"unknown type {q.get('type')!r}")
        ok = False
    if fmt in ("choice", "multi"):
        opts = q.get("options") or []
        n_ok = sum(1 for o in opts if o.get("correct"))
        ids = [o.get("id") for o in opts]
        if len(set(ids)) != len(ids) or None in ids:
            rep.error(qid, "option ids are missing or repeated")
            ok = False
        if fmt == "choice" and (n_ok != 1 or not 3 <= len(opts) <= 6):
            rep.error(qid, f"choice needs exactly 1 correct of 3 to 6 options, has {n_ok} of {len(opts)}")
            ok = False
        if fmt == "multi" and (n_ok < 2 or not 4 <= len(opts) <= 6):
            rep.error(qid, f"multi needs 2 or more correct of 4 to 6 options, has {n_ok} of {len(opts)}")
            ok = False
    if fmt == "order" and not 3 <= len(q.get("items") or []) <= 7:
        rep.error(qid, "order needs 3 to 7 items")
        ok = False
    if fmt == "bucket":
        bids = {b.get("id") for b in q.get("buckets") or []}
        items = q.get("items") or []
        if len(bids) < 2 or not items or any(it.get("bucket") not in bids for it in items):
            rep.error(qid, "bucket ids do not match the items")
            ok = False
    if fmt == "text":
        must = (q.get("rubric") or {}).get("must") or []
        if not must:
            rep.error(qid, "text question without a rubric")
            ok = False
        elif (q["rubric"].get("pass") or len(must)) > len(must):
            rep.error(qid, "rubric `pass` is larger than the number of `must` points")
            ok = False
    if q.get("idea") and q.get("idea") not in ideas:
        rep.warn(qid, f"idea {q.get('idea')} is not declared, so it has no primer and opens no card")
    if q.get("rel") not in (None,) + RELS:
        rep.error(qid, f"unknown rel {q.get('rel')!r}")
        ok = False
    if q.get("resume") not in (None,) + RESUME:
        rep.error(qid, f"unknown resume tag {q.get('resume')!r}")
        ok = False
    ch = q.get("challenge")
    if ch is not None and not (isinstance(ch, dict) and ch.get("prompt")):
        rep.error(qid, "challenge needs a `prompt`")
        ok = False
    try:
        d = int(q.get("difficulty", 5 if final else 0))
    except (TypeError, ValueError):
        d = 0
    if not 1 <= d <= 5:
        rep.error(qid, "difficulty must be 1 to 5")
        ok = False
    return ok


def check_stop(sid, d, rep, all_ids):
    ideas = {i.get("id") for i in d.get("ideas") or []}
    for i in d.get("ideas") or []:
        if not i.get("id") or not i.get("name"):
            rep.error(sid, "every idea needs `id` and `name`")
        elif i.get("primer") and len(i["primer"].split()) > 60:
            rep.warn(i["id"], "primer is over 60 words")
    questions = []
    for q in d.get("questions") or []:
        if q.get("id") in all_ids:
            rep.error(q.get("id"), "question id is used twice")
            continue
        if check_question(q, ideas, rep):
            all_ids.add(q["id"])
            q["difficulty"] = int(q["difficulty"])
            q.setdefault("probes", [])
            questions.append(q)
    finals = []
    for f in d.get("finals") or []:
        if f.get("id") in all_ids:
            rep.error(f.get("id"), "final id is used twice")
            continue
        # a final ties ideas together, so it may stand under a synthetic idea of its own
        f.setdefault("idea", sid + ".final")
        if check_question(f, ideas | {sid + ".final"}, rep, final=True):
            all_ids.add(f["id"])
            f.update(format="text", difficulty=5, isFinal=True)
            f.setdefault("type", "apply")
            f.setdefault("probes", [])
            finals.append(f)
    for c in d.get("cards") or []:
        if not c.get("id") or not c.get("title"):
            rep.error(sid, "every card needs `id` and `title`")
        for i in c.get("ideas") or []:
            if i not in ideas:
                rep.warn(c.get("id", sid), f"card opens on idea {i}, which is not declared, so it never opens")
    for o in d.get("open_questions") or []:
        if not o.get("id") or not o.get("question"):
            rep.error(sid, "every open question needs `id` and `question`")
        if o.get("urgency", 3) not in (1, 2, 3):
            rep.error(o.get("id", sid), "urgency must be 1, 2 or 3")

    # Mechanics questions are hidden by default, so a level has to be reachable without them.
    live = [q for q in questions if q.get("rel") != "mechanics" and q.get("type") != "teach"]
    for lvl in (1, 2, 3, 4, 5):
        n = sum(1 for q in live if q["difficulty"] >= lvl)
        if n < 2:
            rep.warn(sid, f"{n} question(s) at difficulty {lvl} or higher once mechanics are hidden, so level {lvl} cannot be earned (needs 2)")
    if not any(q.get("type") == "teach" for q in questions):
        rep.warn(sid, "no teach question, so level 5 cannot be earned")
    if not any(q["format"] == "choice" and not q.get("resume") and q.get("rel") != "mechanics" for q in questions):
        rep.warn(sid, "no choice question the placement can use, so the placement skips this stop")
    if not finals:
        rep.warn(sid, "no final, so the line's final has no integrative problem from this stop")
    return {"ideas": d.get("ideas") or [], "questions": questions, "finals": finals,
            "cards": d.get("cards") or [], "open_questions": d.get("open_questions") or []}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("course_dir", type=Path)
    ap.add_argument("--out", type=Path, help="output folder (default: <course_dir>/dist)")
    args = ap.parse_args()
    src = args.course_dir.resolve()
    out = (args.out or src / "dist").resolve()
    rep = Report()

    course = load_json(src / "course.json", rep) or {}
    stop_ids = check_course(course, rep) if course else []
    stops, all_ids = {}, set()
    for sid in stop_ids:
        path = src / "content" / f"{sid}.json"
        if not path.exists():
            rep.warn(sid, "no content file yet, so its line stays off the map")
            continue
        d = load_json(path, rep)
        if d is not None:
            stops[sid] = check_stop(sid, d, rep, all_ids)
    for path in sorted((src / "content").glob("*.json")):
        if path.stem not in stop_ids:
            rep.warn(path.name, "not a stop in course.json, so it is ignored")
    full_lines = [l for l in course.get("lines") or [] if all(stops.get(s["id"], {}).get("questions") for s in l.get("stops") or [])]
    if course and not full_lines:
        rep.error("course.json", "no line has questions at every stop, so the map would be empty")

    head_path = src / "build" / "head.html"
    if not head_path.exists():
        rep.error("build/head.html", "file missing")
    for name in SCRIPTS:
        if not (src / "js" / f"{name}.js").exists():
            rep.error(f"js/{name}.js", "file missing")

    if course and head_path.exists():
        title = html.escape(course.get("title", "Course"))
        head = head_path.read_text(encoding="utf-8").replace("{{title}}", title)
        scripts = "".join(f'<script src="js/{n}.js"></script>\n' for n in SCRIPTS)
        page = head + BODY.replace("{title}", title) + scripts
        (out / "data").mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(page, encoding="utf-8")
        (out / "preview.html").write_text(PREVIEW.replace("{page}", page), encoding="utf-8")
        if (out / "js").exists():
            shutil.rmtree(out / "js")
        shutil.copytree(src / "js", out / "js")
        content = {"course": course, "stops": stops, "built": time.strftime("%Y-%m-%d %H:%M")}
        (out / "data" / "content.json").write_text(json.dumps(content, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

        nq = sum(len(s["questions"]) for s in stops.values())
        hidden = sum(1 for s in stops.values() for q in s["questions"] if q.get("rel") == "mechanics")
        print(f"built {out}")
        print(f"  {len(full_lines)} of {len(course.get('lines') or [])} lines on the map, {len(stops)} stops, {nq} questions ({hidden} mechanics),"
              f" {sum(len(s['finals']) for s in stops.values())} finals, {sum(len(s['cards']) for s in stops.values())} cards,"
              f" {sum(len(s['open_questions']) for s in stops.values())} open questions")
    for w in rep.warnings:
        print("  warning", w)
    for e in rep.errors:
        print("  error", e)
    if rep.errors:
        print(f"{len(rep.errors)} error(s), {len(rep.warnings)} warning(s)")
        sys.exit(1)
    print(f"no errors, {len(rep.warnings)} warning(s)")


if __name__ == "__main__":
    main()
