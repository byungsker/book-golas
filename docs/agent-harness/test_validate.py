from __future__ import annotations

import json
import datetime as datetime_module
import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent))
from validate import POLICY_PATH, validate


SHA = "0" * 40


def state() -> dict:
    started_at = datetime_module.datetime.now(datetime_module.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return {
        "schema_version": 1,
        "task_id": "test-task",
        "objective": "validate the harness",
        "status": "in_progress",
        "scope": {"include": ["docs/agent-harness/**"], "exclude": ["**/.env"]},
        "branch": "codex/feature/operations/1.1.0/test-harness",
        "base_sha": SHA,
        "head_sha": SHA,
        "head_history": [SHA],
        "started_at": started_at,
        "last_checkpoint_at": started_at,
        "step": "test",
        "completed": [],
        "next_action": "continue",
        "blocked_by": [],
        "dirty_paths": [],
        "approvals": [],
        "usage": {"elapsed_seconds": 0, "attempts": 0, "llm_usd": 0, "provider_calls": 0, "external_spend_usd": 0, "max_command_seconds": 0},
        "recovery": {"mode": "retry_once", "owner": "agent", "next_action": "continue", "reason": None},
        "budget": {"max_minutes": 45, "max_attempts": 3, "max_llm_usd": 5, "provider_calls": 0, "external_spend_usd": 0},
        "evidence": {"checks": [], "last_error": None},
    }


def event() -> dict:
    return {"seq": 1, "ts": "2026-08-31T00:00:00Z", "task_id": "test-task", "event": "checkpoint", "step": "test", "result": "pass", "head_sha": SHA, "paths": ["docs/agent-harness/test_validate.py"], "next_action": "continue"}


def approved_state() -> dict:
    current_state = state()
    current_state["approvals"] = [{
        "approval_id": "approval-1",
        "action": "external_send",
        "target": "test target",
        "scope": ["docs/agent-harness/**"],
        "head_sha": SHA,
        "actor": "human",
        "granted_at": "2026-08-31T00:00:00Z",
        "expires_at": "2026-08-31T01:00:00Z",
        "status": "approved",
        "consumed": True,
    }]
    return current_state


class HarnessValidationTests(unittest.TestCase):
    def write_case(self, current_state: dict, current_event: dict, current_policy: dict | None = None) -> dict:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state_path = root / "state.json"
            events_path = root / "events.jsonl"
            policy_path = root / "policy.json"
            state_path.write_text(json.dumps(current_state), encoding="utf-8")
            events_path.write_text(json.dumps(current_event) + "\n", encoding="utf-8")
            policy = current_policy if current_policy is not None else json.loads(POLICY_PATH.read_text(encoding="utf-8"))
            policy_path.write_text(json.dumps(policy), encoding="utf-8")
            return validate(policy_path, state_path, events_path)

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
        current_state["evidence"]["customer_email"] = "redacted"
        result = self.write_case(current_state, event())
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("sensitive" in error for error in result["errors"]))

    def test_scope_drift_fails_closed(self) -> None:
        current_state = state()
        current_state["scope"]["include"] = [".env"]
        result = self.write_case(current_state, event())
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("write roots" in error for error in result["errors"]))

    def test_dirty_path_drift_fails_closed(self) -> None:
        current_state = state()
        current_state["dirty_paths"] = [".env"]
        result = self.write_case(current_state, event())
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("dirty_paths" in error for error in result["errors"]))

    def test_event_scope_drift_fails_closed(self) -> None:
        current_event = event()
        current_event["paths"] = ["README.md"]
        result = self.write_case(state(), current_event)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("task scope" in error for error in result["errors"]))

    def test_unknown_event_fails_closed(self) -> None:
        current_event = event()
        current_event["event"] = "unknown_side_effect"
        result = self.write_case(state(), current_event)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("event catalog" in error for error in result["errors"]))

    def test_malformed_event_fails_closed(self) -> None:
        current_event = event()
        current_event["head_sha"] = []
        result = self.write_case(state(), current_event)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("head_sha is invalid" in error for error in result["errors"]))

    def test_bound_approval_passes(self) -> None:
        current_state = approved_state()
        current_event = event()
        current_event.update({"event": "external_send", "target": "test target", "approval_id": "approval-1", "approval_status": "approved"})
        result = self.write_case(current_state, current_event)
        self.assertEqual(result["status"], "pass")

    def test_approved_duration_overage_fails_closed(self) -> None:
        current_event = event()
        current_event.update({"event": "external_send", "target": "test target", "approval_id": "approval-1", "approval_status": "approved", "duration_seconds": 301})
        result = self.write_case(approved_state(), current_event)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("duration policy" in error for error in result["errors"]))

    def test_network_enabled_policy_fails_closed(self) -> None:
        current_policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
        current_policy["capabilities"]["read"]["network"] = True
        result = self.write_case(state(), event(), current_policy)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("read capability" in error for error in result["errors"]))

    def test_malformed_policy_fails_structured(self) -> None:
        current_policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
        current_policy["capabilities"] = []
        result = self.write_case(state(), event(), current_policy)
        self.assertEqual(result["status"], "fail")
        self.assertTrue(any("structured validation" in error for error in result["errors"]))


if __name__ == "__main__":
    unittest.main()
