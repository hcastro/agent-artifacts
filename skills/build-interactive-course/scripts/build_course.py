#!/usr/bin/env python3
"""Validate a course and build it into one self-contained HTML file.

    python3 build_course.py <course_dir> [--out <dir>]

<course_dir> holds course.json, content/<stop-id>.json, build/head.html, js/*.js and js/components/*.js.
The output folder gets course.html: the page, its styles, its scripts and all course data inline. It
opens from disk in any modern browser, with no server and no network.

Every problem is printed. Errors break the page or drop authored work, make the exit code 1 and stop
the file from being written. Warnings leave the page working but weaken it, such as a level nobody can
earn. Standard library only.
"""
import argparse
import html
import json
import re
import sys
import time
from pathlib import Path

# Formats the kit ships. A course can add its own by dropping js/components/<format>.js in place.
BUILT_IN = ("choice", "multi", "order", "bucket", "text", "reveal", "replay", "spot", "estimate")
TYPES = ("predict", "explain", "flaw", "apply", "connect", "teach")
RELS = ("owner", "useful", "mechanics")
RESUME = ("open", "misconception")
# Load order matters: the engine first, then the helpers and the component registry, every
# component, and last the views that use them.
CORE_BEFORE = ("engine", "util", "fx", "tutor", "components")
CORE_AFTER = ("learn", "views", "main")
# A spot block longer than this is a wall to click through, and a replay longer than this is a lecture.
SPOT_MAX_LINES = 40
REPLAY_STEPS = (2, 20)

BODY = """<div class="app" id="app">
  <header class="top"><div class="top-in" id="top-in">
    <div class="brand"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="5"/></svg>{title}</div>
  </div></header>
  <main id="view"><div class="loading"><div class="ring-spin"></div><p>Loading the course and your progress.</p></div></main>
  <nav class="tabbar" id="tabbar" aria-label="Sections"></nav>
</div>
"""

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
{head}
</head>
<body>
{body}<script type="application/json" id="course-data">{data}</script>
{scripts}
</body>
</html>
"""


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
        # a lesson is a single stop, so a line may be that short
        if not 1 <= len(stops) <= 10:
            rep.error(f"line {lid}", f"{len(stops)} stops, the map supports 1 to 10")
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


def check_options(holder, rep, where, lo=3, hi=6):
    """A single-answer option list: unique ids and exactly one correct option."""
    opts = (holder.get("options") if isinstance(holder, dict) else None) or []
    n_ok = sum(1 for o in opts if o.get("correct"))
    ids = [o.get("id") for o in opts]
    if len(set(ids)) != len(ids) or None in ids:
        rep.error(where, "option ids are missing or repeated")
        return False
    if n_ok != 1 or not lo <= len(opts) <= hi:
        rep.error(where, f"needs exactly 1 correct of {lo} to {hi} options, has {n_ok} of {len(opts)}")
        return False
    return True


def check_rubric(q, rep, qid):
    must = (q.get("rubric") or {}).get("must") or []
    if not must:
        rep.error(qid, "written answer without a rubric")
        return False
    if (q["rubric"].get("pass") or len(must)) > len(must):
        rep.error(qid, "rubric `pass` is larger than the number of `must` points")
        return False
    return True


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def check_spot(q, rep, qid):
    body = (q.get("block") or {}).get("body")
    if not isinstance(body, str) or not body.strip():
        rep.error(qid, "spot needs `block.body` as a string")
        return False
    n = len(body.split("\n"))
    if not 2 <= n <= SPOT_MAX_LINES:
        rep.error(qid, f"spot block has {n} lines, the component supports 2 to {SPOT_MAX_LINES}")
        return False
    lines = q.get("lines") or []
    if not lines or len(set(lines)) != len(lines) or any(not isinstance(x, int) or isinstance(x, bool) or not 1 <= x <= n for x in lines):
        rep.error(qid, f"spot `lines` must be distinct line numbers from 1 to {n}")
        return False
    for key in ("line_notes", "line_probes"):
        for k in q.get(key) or {}:
            if not str(k).isdigit() or not 1 <= int(k) <= n:
                rep.error(qid, f"`{key}` names line {k}, which is not in the block")
                return False
    if len(lines) == n:
        rep.warn(qid, "every line is part of the answer, so marking everything wins")
    return True


def check_replay(q, rep, qid):
    steps = q.get("steps") or []
    lo, hi = REPLAY_STEPS
    if not lo <= len(steps) <= hi:
        rep.error(qid, f"replay needs {lo} to {hi} steps, has {len(steps)}")
        return False
    ok, pauses = True, 0
    for i, s in enumerate(steps):
        if not isinstance(s, dict) or not s.get("label"):
            rep.error(qid, f"step {i + 1} needs a `label`")
            ok = False
            continue
        if "pause" in s:
            pauses += 1
            ok = check_options(s["pause"], rep, f"{qid} step {i + 1} pause", lo=2) and ok
    if not pauses:
        rep.error(qid, "replay needs at least one step with a `pause`")
        ok = False
    return ok


def check_estimate(q, rep, qid):
    v, rng, sc = q.get("value"), q.get("range"), q.get("scale")
    if not is_num(v) or not (isinstance(rng, list) and len(rng) == 2 and all(is_num(x) for x in rng)):
        rep.error(qid, "estimate needs a number `value` and a `range` of two numbers")
        return False
    if not rng[0] <= v <= rng[1]:
        rep.error(qid, "estimate `value` must sit inside `range`")
        return False
    if sc is not None and not (isinstance(sc, list) and len(sc) == 2 and all(is_num(x) for x in sc) and sc[0] <= rng[0] and rng[1] <= sc[1]):
        rep.error(qid, "estimate `scale` must be two numbers that contain `range`")
        return False
    if not q.get("unit"):
        rep.warn(qid, "estimate has no `unit`, so the learner guesses a bare number")
    return True


def check_format(q, fmt, rep, custom):
    """Format-specific checks. Returns True when the question can be shown."""
    qid = q.get("id") or "(question without id)"
    if fmt == "choice":
        return check_options(q, rep, qid)
    if fmt == "multi":
        opts = q.get("options") or []
        n_ok = sum(1 for o in opts if o.get("correct"))
        ids = [o.get("id") for o in opts]
        if len(set(ids)) != len(ids) or None in ids:
            rep.error(qid, "option ids are missing or repeated")
            return False
        if n_ok < 2 or not 4 <= len(opts) <= 6:
            rep.error(qid, f"multi needs 2 or more correct of 4 to 6 options, has {n_ok} of {len(opts)}")
            return False
        return True
    if fmt == "order":
        if not 3 <= len(q.get("items") or []) <= 7:
            rep.error(qid, "order needs 3 to 7 items")
            return False
        return True
    if fmt == "bucket":
        bids = {b.get("id") for b in q.get("buckets") or []}
        items = q.get("items") or []
        if len(bids) < 2 or not items or any(it.get("bucket") not in bids for it in items):
            rep.error(qid, "bucket ids do not match the items")
            return False
        return True
    if fmt == "text":
        return check_rubric(q, rep, qid)
    if fmt == "reveal":
        b = q.get("block") or {}
        if not all(isinstance(b.get(k), str) and b[k].strip() for k in ("shown", "hidden")):
            rep.error(qid, "reveal needs `block.shown` and `block.hidden`")
            return False
        return check_options(q, rep, qid, lo=2) if q.get("options") else check_rubric(q, rep, qid)
    if fmt == "replay":
        return check_replay(q, rep, qid)
    if fmt == "spot":
        return check_spot(q, rep, qid)
    if fmt == "estimate":
        return check_estimate(q, rep, qid)
    if fmt in custom and not (q.get("rubric") or {}).get("must"):
        # The build cannot know a custom component's data, so it checks the text fallback instead.
        rep.warn(qid, f"custom format {fmt} has no `rubric`, so its text fallback checks against the whole answer")
    return True


def check_question(q, ideas, rep, custom, final=False):
    """Returns True when the question can be shown. Anything that cannot is an error."""
    qid = q.get("id") or "(question without id)"
    ok = True
    for key in ("id", "idea", "prompt", "answer"):
        if not q.get(key):
            rep.error(qid, f"missing `{key}`")
            ok = False
    fmt = q.get("format", "text" if final else None)
    if fmt not in BUILT_IN and fmt not in custom:
        rep.error(qid, f"unknown format {fmt!r}. Add js/components/{fmt}.js or use one of: {', '.join(BUILT_IN)}")
        return False
    if q.get("type", "apply" if final else None) not in TYPES:
        rep.error(qid, f"unknown type {q.get('type')!r}")
        ok = False
    ok = check_format(q, fmt, rep, custom) and ok
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


def check_stop(sid, d, rep, all_ids, custom):
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
        if check_question(q, ideas, rep, custom):
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
        if check_question(f, ideas | {sid + ".final"}, rep, custom, final=True):
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


def inline_script(src, name):
    # A literal "</script" inside a script would end the tag early, so it is broken up.
    return f"<script>/* {name} */\n" + re.sub(r"</(script)", r"<\\/\1", src, flags=re.I) + "\n</script>"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("course_dir", type=Path)
    ap.add_argument("--out", type=Path, help="output folder (default: <course_dir>/dist)")
    args = ap.parse_args()
    src = args.course_dir.resolve()
    out = (args.out or src / "dist").resolve()
    rep = Report()

    comp_dir = src / "js" / "components"
    comp_files = sorted(comp_dir.glob("*.js")) if comp_dir.is_dir() else []
    custom = {p.stem for p in comp_files} - set(BUILT_IN)
    for name in BUILT_IN:
        if not (comp_dir / f"{name}.js").exists():
            rep.error(f"js/components/{name}.js", "file missing")
    for name in CORE_BEFORE + CORE_AFTER:
        if not (src / "js" / f"{name}.js").exists():
            rep.error(f"js/{name}.js", "file missing")

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
            stops[sid] = check_stop(sid, d, rep, all_ids, custom)
    for path in sorted((src / "content").glob("*.json")):
        if path.stem not in stop_ids:
            rep.warn(path.name, "not a stop in course.json, so it is ignored")
    full_lines = [l for l in course.get("lines") or [] if all(stops.get(s["id"], {}).get("questions") for s in l.get("stops") or [])]
    if course and not full_lines:
        rep.error("course.json", "no line has questions at every stop, so the map would be empty")

    head_path = src / "build" / "head.html"
    head_text = ""
    if not head_path.exists():
        rep.error("build/head.html", "file missing")
    else:
        head_text = head_path.read_text(encoding="utf-8")
        # the file has to open offline and make no requests, so flag anything that reaches out
        m = re.search(r"""(?:href|src)\s*=\s*["']?(?:https?:)?//|@import|url\(\s*["']?(?:https?:)?//""", head_text, flags=re.I)
        if m:
            rep.warn("build/head.html", f"loads something from the network ({m.group(0)!r}), so the page needs a connection")

    if course and head_text and not rep.errors:
        title = html.escape(course.get("title", "Course"))
        names = [f"js/{n}.js" for n in CORE_BEFORE] + [f"js/components/{p.name}" for p in comp_files] + [f"js/{n}.js" for n in CORE_AFTER]
        scripts = "\n".join(inline_script((src / n).read_text(encoding="utf-8"), n) for n in names)
        content = {"course": course, "stops": stops, "built": time.strftime("%Y-%m-%d %H:%M")}
        # "<" is escaped so no string in the course data can close the data tag
        data = json.dumps(content, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")
        page = PAGE.format(head=head_text.replace("{{title}}", title).strip(), body=BODY.replace("{title}", title), data=data, scripts=scripts)
        out.mkdir(parents=True, exist_ok=True)
        (out / "course.html").write_text(page, encoding="utf-8")

        nq = sum(len(s["questions"]) for s in stops.values())
        hidden = sum(1 for s in stops.values() for q in s["questions"] if q.get("rel") == "mechanics")
        fmts = {}
        for s in stops.values():
            for q in s["questions"]:
                fmts[q["format"]] = fmts.get(q["format"], 0) + 1
        print(f"built {out / 'course.html'} ({len(page.encode('utf-8')) // 1024} KB)")
        print(f"  {len(full_lines)} of {len(course.get('lines') or [])} lines on the map, {len(stops)} stops, {nq} questions ({hidden} mechanics),"
              f" {sum(len(s['finals']) for s in stops.values())} finals, {sum(len(s['cards']) for s in stops.values())} cards,"
              f" {sum(len(s['open_questions']) for s in stops.values())} open questions")
        print("  formats: " + ", ".join(f"{k} {v}" for k, v in sorted(fmts.items())))
        if custom:
            print("  custom components: " + ", ".join(sorted(custom)))
    for w in rep.warnings:
        print("  warning", w)
    for e in rep.errors:
        print("  error", e)
    if rep.errors:
        print(f"{len(rep.errors)} error(s), {len(rep.warnings)} warning(s), nothing written")
        sys.exit(1)
    print(f"no errors, {len(rep.warnings)} warning(s)")


if __name__ == "__main__":
    main()
