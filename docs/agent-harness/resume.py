from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "harness-policy.json"

from validate import load_json, validate


def last_event(path: Path) -> dict[str, Any]:
    lines = path.read_text(encoding="utf-8").splitlines()
    value = json.loads(lines[-1])
    allowed = {"seq", "event", "result", "step", "head_sha", "next_action", "error_class", "duration_seconds"}
    return {key: value[key] for key in allowed if key in value}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=POLICY_PATH)
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args()
    repository = args.repo.resolve()
    expected_repository = ROOT.parent.parent.resolve()
    expected_policy = POLICY_PATH.resolve()
    expected_state = expected_repository / "docs/agent-harness/runtime/task-state.json"
    expected_events = expected_repository / "docs/agent-harness/runtime/events.jsonl"
    if repository != expected_repository or args.policy.resolve() != expected_policy or args.state.resolve() != expected_state or args.events.resolve() != expected_events:
        print(json.dumps({"status": "fail", "error": "resume paths are outside the harness repository"}, ensure_ascii=False))
        return 1
    result = validate(args.policy, args.state, args.events, args.repo)
    if result["status"] != "pass":
        print(json.dumps(result, ensure_ascii=False))
        return 1
    state = load_json(args.state)
    if state["status"] in {"blocked", "aborted"}:
        output_status = "handoff_required"
    elif state["status"] == "done":
        output_status = "complete"
    else:
        output_status = "resume_ready"
    output = {
        "status": output_status,
        "objective": state["objective"],
        "task_id": state["task_id"],
        "branch": state["branch"],
        "base_sha": state["base_sha"],
        "head_sha": state["head_sha"],
        "step": state["step"],
        "completed": state["completed"],
        "next_action": state["next_action"],
        "blocked_by": state["blocked_by"],
        "dirty_paths": state["dirty_paths"],
        "usage": state["usage"],
        "recovery": state["recovery"],
        "last_event": last_event(args.events),
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 2 if output_status == "handoff_required" else 0


if __name__ == "__main__":
    sys.exit(main())
