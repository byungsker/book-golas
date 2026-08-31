from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))
from validate import POLICY_PATH, validate


SHA = "0" * 40


def state() -> dict:
    return {
        "schema_version": 1,
        "task_id": "test-task",
        "objective": "validate the harness",
        "status": "in_progress",
        "scope": {"include": ["docs/agent-harness/**"], "exclude": ["**/.env"]},
        "branch": "codex/feature/operations/1.1.0/test-harness",
        "base_sha": SHA,
        "head_sha": SHA,
        "step": "test",
        "completed": [],
        "next_action": "continue",
        "blocked_by": [],
        "dirty_paths": [],
        "approvals": [],
        "budget": {"max_minutes": 45, "max_attempts": 3, "max_llm_usd": 5, "provider_calls": 0, "external_spend_usd": 0},
        "evidence": {"checks": [], "last_error": None},
    }


def event() -> dict:
    return {"ts": "2026-08-31T00:00:00Z", "task_id": "test-task", "event": "checkpoint", "step": "test", "result": "pass", "head_sha": SHA, "paths": ["docs/agent-harness/test_validate.py"], "next_action": "continue"}


class HarnessValidationTests(unittest.TestCase):
    def write_case(self, current_state: dict, current_event: dict) -> dict:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state_path = root / "state.json"
            events_path = root / "events.jsonl"
            state_path.write_text(json.dumps(current_state), encoding="utf-8")
            events_path.write_text(json.dumps(current_event) + "\n", encoding="utf-8")
            return validate(POLICY_PATH, state_path, events_path)

    def test_valid_contract(self) -> None:
        self.assertEqual(self.write_case(state(), event())["status"], "pass")

    def test_budget_overage_fails_closed(self) -> None:
        current_state = state()
        current_state["budget"]["max_llm_usd"] = 6
        result = self.write_case(current_state, event())
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("exceeds policy" in error for error in result["errors"]))

    def test_unapproved_external_action_fails(self) -> None:
        current_event = event()
        current_event["event"] = "external_send"
        result = self.write_case(state(), current_event)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("without approval" in error for error in result["errors"]))

    def test_sensitive_payload_fails(self) -> None:
        current_state = state()
        current_state["evidence"]["api_token"] = "do not store"
        result = self.write_case(current_state, event())
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("sensitive" in error for error in result["errors"]))

    def test_scope_drift_fails_closed(self) -> None:
        current_state = state()
        current_state["scope"]["include"] = [".env"]
        result = self.write_case(current_state, event())
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("write roots" in error for error in result["errors"]))

    def test_event_scope_drift_fails_closed(self) -> None:
        current_event = event()
        current_event["paths"] = ["README.md"]
        result = self.write_case(state(), current_event)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("task scope" in error for error in result["errors"]))


if __name__ == "__main__":
    unittest.main()
