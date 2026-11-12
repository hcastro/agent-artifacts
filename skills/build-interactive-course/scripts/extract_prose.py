#!/usr/bin/env python3
"""Pull the prose a learner reads out of each stop file, so a rewrite pass can touch only that.

    python3 extract_prose.py <content_dir> <out_dir> [stop-id ...]

Writes <out_dir>/<stop-id>.json: a list of blocks, each with the item id, a note on what the text is,
read-only context for the rewriter (correct options, order and bucket items) and the editable fields.
Hand those files to the rewriter, and have it return {"<item id>": {"<field>": "<new text>"}} per stop
for merge_prose.py. With no stop ids, every *.json in <content_dir> is extracted.
"""
import json
import sys
from pathlib import Path


def fields_of(item, kind):
    f = {}
    if kind == "idea":
        f["primer"] = item.get("primer")
    elif kind in ("question", "final"):
        for k in ("prompt", "answer", "owner"):
            if isinstance(item.get(k), str):
                f[k] = item[k]
        for i, p in enumerate(item.get("probes") or []):
            if isinstance(p, str):
                f[f"probes/{i}"] = p
        for o in item.get("options") or []:
            f[f"options/{o['id']}/text"] = o.get("text")
            if o.get("probe"):
                f[f"options/{o['id']}/probe"] = o["probe"]
        if item.get("format") == "bucket":
            for i, it in enumerate(item.get("items") or []):
                if it.get("why"):
                    f[f"items/{i}/why"] = it["why"]
        ch = item.get("challenge") or {}
        for k in ("prompt", "why"):
            if isinstance(ch.get(k), str):
                f[f"challenge/{k}"] = ch[k]
    elif kind == "card":
        f["note"] = item.get("note")
    elif kind == "open_question":
        f["question"] = item.get("question")
        f["why"] = item.get("why")
    return {k: v for k, v in f.items() if isinstance(v, str) and v.strip()}


def blocks(d):
    out = []
    for it in d.get("ideas", []):
        out.append({"id": it["id"], "what": "primer for the idea \"%s\". Shown once before the first question on this idea. At most 60 words. It must not state the answer to any question." % it.get("name", ""),
                    "fields": fields_of(it, "idea")})
    for kind, key in (("question", "questions"), ("final", "finals")):
        for q in d.get(key, []):
            ctx = {"format": q.get("format", "text"), "difficulty": q.get("difficulty"), "title": q.get("title")}
            if q.get("options"):
                ctx["correct_options"] = [o["id"] for o in q["options"] if o.get("correct")]
            if q.get("context"):
                body = q["context"].get("body")
                body = body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)
                ctx["shown_beside_the_question"] = str(q["context"].get("label") or "") + ": " + (body or "")[:500]
            if q.get("format") == "order":
                ctx["items_in_correct_order_not_editable"] = q.get("items")
            if q.get("format") == "bucket":
                ctx["bucket_items_not_editable"] = [{"text": it.get("text"), "bucket": it.get("bucket")} for it in q.get("items") or []]
            out.append({"id": q["id"], "what": kind, "context_for_you": ctx, "fields": fields_of(q, kind)})
    for c in d.get("cards", []):
        out.append({"id": c["id"], "what": "note under a reference card titled \"%s\". The card shows an excerpt from %s." % (c.get("title", ""), c.get("source") or "the sources"),
                    "fields": fields_of(c, "card")})
    for a in d.get("open_questions", []):
        out.append({"id": a["id"], "what": "an open question the sources could not answer, with the reason it matters",
                    "fields": fields_of(a, "open_question")})
    return [b for b in out if b["fields"]]


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    content, out = Path(sys.argv[1]), Path(sys.argv[2])
    names = sys.argv[3:] or sorted(p.stem for p in content.glob("*.json"))
    out.mkdir(parents=True, exist_ok=True)
    for name in names:
        d = json.loads((content / f"{name}.json").read_text(encoding="utf-8"))
        b = blocks(d)
        (out / f"{name}.json").write_text(json.dumps(b, indent=1, ensure_ascii=False), encoding="utf-8")
        n = sum(len(x["fields"]) for x in b)
        chars = sum(len(v) for x in b for v in x["fields"].values())
        print(name, len(b), "items", n, "fields", chars, "chars")


if __name__ == "__main__":
    main()
