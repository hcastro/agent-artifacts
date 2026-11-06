"""Check index routing without touching the user's qmd configuration or Git history."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


HELPER = Path(__file__).resolve().parents[1] / "scripts" / "qmd-memory.sh"


class HelperTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="qmd-memory-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        for name in ("bin", "config", "project", "kb", "private", "docs"):
            (self.root / name).mkdir()
        self.config = self.root / "config"
        self.log = self.root / "calls.jsonl"
        self.env = {
            key: value for key, value in os.environ.items()
            if not key.startswith(("QMD_", "KB_", "GIT_", "XDG_"))
            and key not in ("INDEX_PATH", "BASH_ENV", "ENV", "CDPATH")
        }
        self.env.update({
            "PATH": str(self.root / "bin") + os.pathsep + os.environ["PATH"],
            "XDG_CACHE_HOME": str(self.root / "cache"),
            "QMD_CONFIG_DIR": str(self.config),
            "QMD_KB_PATH": str(self.root / "kb"),
            "QMD_WORKBENCH_PATH": str(self.root / "private"),
            "QMD_WORKBENCH_INDEX": "private-notes",
            "TEST_QMD_LOG": str(self.log),
        })
        stub = self.root / "bin" / "qmd"
        stub.write_text(
            "#!/usr/bin/env python3\n"
            "import json, os, sys\n"
            "args = sys.argv[1:]\n"
            "with open(os.environ['TEST_QMD_LOG'], 'a') as f:\n"
            "    f.write(json.dumps(args) + '\\n')\n"
            "if args == ['--version']:\n"
            "    print('qmd 2.8.3')\n"
            "elif args[2] in ('query', 'search'):\n"
            "    if os.environ.get('TEST_QMD_FAIL') == args[1]:\n"
            "        print('index unavailable', file=sys.stderr)\n"
            "        sys.exit(1)\n"
            "    print(json.dumps([{'index': args[1], 'title': 'Example note'}]))\n"
            "elif args[2] == 'status':\n"
            "    print('Orphaned: 0 embedding chunks (0%)')\n"
        )
        stub.chmod(0o755)
        self.set_scope("orchard")
        self.git("init", "-q")
        self.git("remote", "add", "origin", "git@github.com:sample/reader.git")
        self.index("orchard", "kb", "Project notes")
        self.index("private-notes", "private", "Private working notes")
        self.index("reader-docs", "docs", "Runbooks for sample/reader.")
        self.index("other-docs", "docs", "Runbooks for sample/reader-components.")

    def git(self, *args):
        subprocess.run(
            ["git", "-C", str(self.root / "project"), *args],
            env=self.env, check=True, capture_output=True, text=True,
        )

    def set_scope(self, namespace):
        (self.root / "kb" / ".kb-config").write_text(
            f'KB_TEAM="{namespace}"\nKB_TEAM_DESCRIPTION="Project notes"\n'
        )

    def index(self, name, folder, context):
        (self.config / f"{name}.yml").write_text(
            f'global_context: "{context}"\ncollections:\n  notes:\n'
            f'    path: {self.root / folder}\n    pattern: "**/*.md"\n'
        )

    def run_helper(self, *args, expected=0):
        result = subprocess.run(
            ["bash", str(HELPER), *args], cwd=self.root / "project",
            env=self.env, capture_output=True, text=True, timeout=20,
        )
        self.assertEqual(result.returncode, expected, result.stderr + result.stdout)
        return result

    def search_indexes(self, *args):
        result = self.run_helper("lex", *args, "import recovery")
        data = json.loads(result.stdout)
        self.assertEqual(len(result.stdout.splitlines()), 1)
        return [item["index"] for item in data["indexes"]]

    def test_default_search_matches_repo_without_nearby_name(self):
        self.assertEqual(self.search_indexes(), ["orchard", "reader-docs"])

    def test_private_notes_require_selection_by_default(self):
        self.assertEqual(
            self.search_indexes("--with-workbench"),
            ["orchard", "private-notes", "reader-docs"],
        )
        self.assertEqual(self.search_indexes("--workbench"), ["private-notes"])

    def test_scope_flags_replace_default_set(self):
        self.assertEqual(self.search_indexes("--index", "other-docs"), ["other-docs"])
        self.assertEqual(
            self.search_indexes("--team", "--index", "other-docs"),
            ["orchard", "other-docs"],
        )

    def test_another_namespace_and_repo_select_their_own_indexes(self):
        self.set_scope("studio")
        self.index("studio", "kb", "Studio notes")
        self.git("remote", "set-url", "origin", "https://github.com/example/editor.git")
        self.index("editor-docs", "docs", "Docs for example/editor")
        self.assertEqual(self.search_indexes(), ["studio", "editor-docs"])

    def test_private_only_search_needs_no_primary_kb(self):
        del self.env["QMD_KB_PATH"]
        self.assertEqual(self.search_indexes("--workbench"), ["private-notes"])

    def test_setup_uses_configured_namespace_and_plans_without_executing_config(self):
        marker = self.root / "executed"
        with (self.root / "kb" / ".kb-config").open("a") as config:
            config.write(
                f'KB_PLANS_DIR="docs/plans"\nKB_PLANS_COLLECTION="work-plans"\n'
                f'KB_TEAM_DESCRIPTION="$(touch {marker})"\n'
                f'touch "{marker}"\n'
            )
        (self.root / "project" / "docs" / "plans").mkdir(parents=True)
        self.run_helper("setup")
        self.assertFalse(marker.exists())
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        self.assertIn(
            ["--index", "orchard", "collection", "add", str(self.root / "kb"),
             "--name", "orchard-kb", "--mask", "**/*.md"], calls,
        )
        self.assertIn(
            ["--index", "orchard", "collection", "add",
             str(self.root / "project" / "docs" / "plans"),
             "--name", "work-plans", "--mask", "**/*.md"], calls,
        )
        self.assertIn(["--index", "orchard", "embed"], calls)
        self.assertIn(["--index", "private-notes", "embed"], calls)

    def test_one_failed_index_keeps_other_results_and_reports_failure(self):
        self.env["TEST_QMD_FAIL"] = "reader-docs"
        result = self.run_helper("lex", "recovery", expected=1)
        entries = json.loads(result.stdout)["indexes"]
        self.assertTrue(entries[0]["results"])
        self.assertIsNone(entries[1]["results"])
        self.assertIn("error", entries[1])

    def test_unknown_index_fails_before_search(self):
        self.run_helper("lex", "--index", "missing", "recovery", expected=2)
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
