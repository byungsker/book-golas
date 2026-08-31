from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RUNNER = ROOT / "run.py"
RESUMER = ROOT / "resume.py"
EXAMPLE = ROOT / "task-state.example.json"


class HarnessRunnerTests(unittest.TestCase):
    def run_case(self, command: list[str]) -> tuple[subprocess.CompletedProcess[str], Path, Path]:
        directory = tempfile.TemporaryDirectory()
        root = Path(directory.name)
        state_path = root / "state.json"
        events_path = root / "events.jsonl"
        repository = ROOT.parent.parent
        current_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repository, text=True).strip()
        state = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        state.update({"base_sha": current_sha, "head_sha": current_sha, "head_history": [current_sha]})
        state["scope"]["include"] = ["docs/agent-harness/**", ".github/workflows/quality.yml"]
        state_path.write_text(json.dumps(state), encoding="utf-8")
        result = subprocess.run([sys.executable, str(RUNNER), "--state", str(state_path), "--events", str(events_path), "--command-class", "local_verify", "--", *command], cwd=repository, capture_output=True, text=True, check=False)
        self.addCleanup(directory.cleanup)
        return result, state_path, events_path

    def test_allowed_command_records_usage_and_events(self) -> None:
        result, state_path, events_path = self.run_case(["python3", "docs/agent-harness/test_validate.py"])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        state = json.loads(state_path.read_text(encoding="utf-8"))
        events = events_path.read_text(encoding="utf-8").splitlines()
        self.assertEqual(state["status"], "checkpointed")
        self.assertEqual(state["usage"]["attempts"], 1)
        self.assertEqual(len(events), 3)
        resume = subprocess.run([sys.executable, str(RESUMER), "--state", str(state_path), "--events", str(events_path)], cwd=ROOT.parent.parent, capture_output=True, text=True, check=False)
        self.assertEqual(resume.returncode, 0, resume.stdout + resume.stderr)
        self.assertIn("resume_ready", resume.stdout)

    def test_disallowed_command_is_rejected(self) -> None:
        result, _, _ = self.run_case(["rm", "-f", "docs/agent-harness/README.md"])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("allowlist", result.stdout)


if __name__ == "__main__":
    unittest.main()
