#!/usr/bin/env python3
"""Heuristic complexity scanner for strategic-code-design.

This script highlights places that may deserve design review. It is intentionally
conservative: findings are design-pressure signals, not proof of defects.

Usage:
  python scripts/complexity_scan.py path/to/file_or_repo
  python scripts/complexity_scan.py path/to/file_or_repo --json
"""
from __future__ import annotations

import argparse
import ast
import json
import os
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Dict, Any, Optional

CODE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs", ".cs",
    ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".rb", ".php", ".swift",
    ".kt", ".kts", ".scala", ".m", ".mm"
}

IGNORE_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "dist", "build", "target", "out",
    ".venv", "venv", "__pycache__", ".mypy_cache", ".pytest_cache", "coverage",
    ".next", ".turbo", "vendor", "Pods", ".idea", ".vscode"
}

BROAD_EXCEPTION_PATTERNS = [
    re.compile(r"\bexcept\s*:\s*$"),
    re.compile(r"\bexcept\s+Exception\b"),
    re.compile(r"\bexcept\s+BaseException\b"),
    re.compile(r"\bcatch\s*\(\s*(Exception|Throwable|Error)\b"),
    re.compile(r"\bcatch\s*\(\s*\.\.\.\s*\)"),
    re.compile(r"\brescue\s*(=>|$)"),
]

TODO_PATTERN = re.compile(r"\b(TODO|FIXME|HACK|XXX)\b", re.IGNORECASE)
BOOL_PARAM_PATTERN = re.compile(
    r"(\bbool\b|\bboolean\b|:\s*bool\b|:\s*boolean\b|=\s*(true|false)\b|\bis[A-Z_]\w*|\bhas[A-Z_]\w*|\bskip[A-Z_]\w*|\bforce[A-Z_]\w*)"
)
FUNCTION_LIKE_PATTERN = re.compile(
    r"\b(function|def|func|fn|public|private|protected|static|async)\b.*\([^)]*\)"
)
TRIVIAL_FORWARD_PATTERN = re.compile(
    r"^\s*return\s+(self|this|client|repo|repository|service|delegate|inner|wrapped)(\.[A-Za-z_]\w*)+\s*\([^;{}]*\)\s*;?\s*$"
)
COMMENT_LINE_PATTERN = re.compile(r"^\s*(#|//|/\*|\*|<!--)")


@dataclass
class Finding:
    file: str
    line: int
    kind: str
    severity: str
    message: str
    evidence: str


@dataclass
class FileSummary:
    file: str
    loc: int
    findings: List[Finding]


def iter_code_files(root: Path) -> Iterable[Path]:
    if root.is_file():
        if root.suffix in CODE_EXTENSIONS:
            yield root
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix in CODE_EXTENSIONS:
                yield p


def rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root if root.is_dir() else root.parent))
    except ValueError:
        return str(path)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def count_loc(lines: List[str]) -> int:
    return sum(1 for line in lines if line.strip() and not COMMENT_LINE_PATTERN.match(line))


def add_line_findings(path_label: str, lines: List[str]) -> List[Finding]:
    findings: List[Finding] = []
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if COMMENT_LINE_PATTERN.match(stripped) and TODO_PATTERN.search(stripped):
            findings.append(Finding(path_label, idx, "todo-hack", "low", "TODO/FIXME/HACK marker may indicate deferred design work.", stripped[:180]))
        if any(p.search(stripped) for p in BROAD_EXCEPTION_PATTERNS):
            findings.append(Finding(path_label, idx, "broad-exception", "medium", "Broad exception handling can hide failures or multiply unclear error paths.", stripped[:180]))
        if FUNCTION_LIKE_PATTERN.search(stripped) and BOOL_PARAM_PATTERN.search(stripped):
            findings.append(Finding(path_label, idx, "boolean-mode", "medium", "Function signature appears to expose boolean modes; consider named operations or validated options.", stripped[:180]))
        if TRIVIAL_FORWARD_PATTERN.match(stripped):
            findings.append(Finding(path_label, idx, "possible-pass-through", "low", "Line looks like trivial forwarding; inspect whether this layer adds a real abstraction.", stripped[:180]))
    return findings


def duplicate_block_findings(path_label: str, lines: List[str]) -> List[Finding]:
    normalized: List[tuple[int, str]] = []
    for idx, line in enumerate(lines, start=1):
        s = line.strip()
        if not s or COMMENT_LINE_PATTERN.match(s):
            continue
        s = re.sub(r"\s+", " ", s)
        if len(s) < 12:
            continue
        normalized.append((idx, s))
    seen: Dict[tuple[str, ...], int] = {}
    findings: List[Finding] = []
    window = 4
    for i in range(0, max(0, len(normalized) - window + 1)):
        block = tuple(s for _, s in normalized[i:i+window])
        first_line = normalized[i][0]
        if block in seen and first_line - seen[block] > window:
            findings.append(Finding(
                path_label,
                first_line,
                "repeated-block",
                "medium",
                f"Possible repeated {window}-line logic block; duplicated knowledge can cause change amplification.",
                " / ".join(block)[:220],
            ))
            if len(findings) >= 5:
                break
        else:
            seen[block] = first_line
    return findings


def python_ast_findings(path_label: str, text: str) -> List[Finding]:
    findings: List[Finding] = []
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return findings

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            start = getattr(node, "lineno", 0)
            end = getattr(node, "end_lineno", start)
            length = max(0, end - start + 1)
            args = node.args
            param_count = len(args.args) + len(args.kwonlyargs) + len(args.posonlyargs)
            if args.vararg:
                param_count += 1
            if args.kwarg:
                param_count += 1

            if length >= 80:
                findings.append(Finding(path_label, start, "long-function", "medium", f"Function `{node.name}` is {length} lines; inspect for multiple abstractions or hidden invariants.", node.name))
            if param_count >= 6:
                findings.append(Finding(path_label, start, "many-parameters", "medium", f"Function `{node.name}` has {param_count} parameters; interface may overexpose details.", node.name))

            boolish = [a.arg for a in (args.args + args.kwonlyargs + args.posonlyargs) if re.search(r"^(is_|has_|skip_|force_|include_|allow_)|(_flag$)", a.arg)]
            if boolish:
                findings.append(Finding(path_label, start, "boolean-mode", "medium", f"Function `{node.name}` has boolean-looking mode parameter(s): {', '.join(boolish)}.", node.name))

            body = [stmt for stmt in node.body if not isinstance(stmt, ast.Pass)]
            if len(body) == 1 and isinstance(body[0], ast.Return):
                expr = body[0].value
                # Flag only obvious delegation to another object, not local computations
                # such as sum(...), sorted(...), dict.get(...), or constructors.
                if isinstance(expr, ast.Call) and isinstance(expr.func, ast.Attribute):
                    owner = expr.func.value
                    owner_name = None
                    if isinstance(owner, ast.Name):
                        owner_name = owner.id
                    elif isinstance(owner, ast.Attribute) and isinstance(owner.value, ast.Name):
                        owner_name = owner.value.id
                    if owner_name in {"self", "this", "client", "repo", "repository", "service", "delegate", "inner", "wrapped"}:
                        findings.append(Finding(path_label, start, "possible-pass-through", "low", f"Function `{node.name}` appears to delegate to `{owner_name}` in one line; verify it adds abstraction.", node.name))
    return findings


def scan_file(path: Path, root: Path) -> FileSummary:
    text = read_text(path)
    lines = text.splitlines()
    label = rel(path, root)
    findings = []
    findings.extend(add_line_findings(label, lines))
    findings.extend(duplicate_block_findings(label, lines))
    if path.suffix == ".py":
        findings.extend(python_ast_findings(label, text))
    loc = count_loc(lines)
    if loc >= 800:
        findings.append(Finding(label, 1, "large-file", "medium", f"File has about {loc} non-comment LOC; inspect for multiple abstractions or mixed policy/mechanism.", f"{loc} LOC"))
    elif loc >= 400:
        findings.append(Finding(label, 1, "large-file", "low", f"File has about {loc} non-comment LOC; may still be fine if it represents one deep module.", f"{loc} LOC"))
    return FileSummary(label, loc, sorted(findings, key=lambda f: (severity_rank(f.severity), f.file, f.line)))


def severity_rank(sev: str) -> int:
    return {"high": 0, "medium": 1, "low": 2}.get(sev, 9)


def summarize(summaries: List[FileSummary]) -> Dict[str, Any]:
    all_findings = [f for s in summaries for f in s.findings]
    by_kind: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}
    for f in all_findings:
        by_kind[f.kind] = by_kind.get(f.kind, 0) + 1
        by_severity[f.severity] = by_severity.get(f.severity, 0) + 1
    return {
        "files_scanned": len(summaries),
        "total_loc": sum(s.loc for s in summaries),
        "findings": len(all_findings),
        "by_severity": by_severity,
        "by_kind": by_kind,
    }


def markdown_report(root: Path, summaries: List[FileSummary]) -> str:
    summary = summarize(summaries)
    all_findings = sorted([f for s in summaries for f in s.findings], key=lambda f: (severity_rank(f.severity), f.file, f.line))
    lines = []
    lines.append("# Complexity Scan")
    lines.append("")
    lines.append(f"Path: `{root}`")
    lines.append(f"Files scanned: {summary['files_scanned']}")
    lines.append(f"Approximate non-comment LOC: {summary['total_loc']}")
    lines.append(f"Findings: {summary['findings']}")
    lines.append("")
    lines.append("This is a heuristic triage report. Treat findings as design-pressure signals, then inspect code manually.")
    lines.append("")
    if summary["by_kind"]:
        lines.append("## Counts by kind")
        for kind, count in sorted(summary["by_kind"].items(), key=lambda kv: (-kv[1], kv[0])):
            lines.append(f"- {kind}: {count}")
        lines.append("")
    if not all_findings:
        lines.append("No heuristic findings. This does not prove the code is simple or correct.")
        return "\n".join(lines)
    lines.append("## Findings")
    for f in all_findings[:200]:
        lines.append(f"- **{f.severity}** `{f.file}:{f.line}` {f.kind}: {f.message}")
        if f.evidence:
            lines.append(f"  - Evidence: `{f.evidence}`")
    if len(all_findings) > 200:
        lines.append(f"\nTruncated after 200 findings out of {len(all_findings)}.")
    lines.append("")
    lines.append("## Suggested follow-up")
    lines.append("Inspect medium/high clusters first. For each cluster, identify the design decision being exposed or duplicated, then choose the smallest strategic refactor that localizes it.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Heuristic complexity scanner for strategic code design")
    parser.add_argument("path", help="File or directory to scan")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of Markdown")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        raise SystemExit(f"Path not found: {root}")

    summaries = [scan_file(path, root) for path in iter_code_files(root)]
    if args.json:
        payload = {
            "summary": summarize(summaries),
            "files": [
                {"file": s.file, "loc": s.loc, "findings": [asdict(f) for f in s.findings]}
                for s in summaries
            ],
        }
        print(json.dumps(payload, indent=2))
    else:
        print(markdown_report(root, summaries))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
