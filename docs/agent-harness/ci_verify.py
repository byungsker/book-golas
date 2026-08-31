from __future__ import annotations

import argparse
import datetime as datetime_module
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "harness-policy.json"

from validate import OPERATIONS_ALLOWED_PATHS, load_json, validate


def timestamp() -> str:
    return datetime_module.datetime.now(datetime_module.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--head-sha", required=True)
    args = parser.parse_args()
    repository = ROOT.parent.parent
    status = subprocess.run(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=repository, capture_output=True, text=True, check=False)
    if status.returncode != 0 or status.stdout.strip():
        print(json.dumps({"status": "fail", "error": "CI checkout is not clean"}, ensure_ascii=False))
        return 1
    now = timestamp()
    state = {
        "schema_version": 1,
        "task_id": "ci-agent-harness",
        "objective": "verify the operations agent harness against the CI checkout",
        "status": "planned",
        "scope": {"include": OPERATIONS_ALLOWED_PATHS, "exclude": ["**/.env", "**/secrets/**", "**/node_modules/**"]},
        "branch": "codex/feature/operations/1.1.0/ci-contract",
        "base_sha": args.base_sha,
        "head_sha": args.head_sha,
        "head_history": [args.base_sha] if args.base_sha == args.head_sha else [args.base_sha, args.head_sha],
        "started_at": None,
        "last_checkpoint_at": None,
        "step": "CI exact-head verification",
        "completed": [],
        "next_action": "report verification result",
        "blocked_by": [],
        "dirty_paths": [],
        "approvals": [],
        "usage": {"elapsed_seconds": 0, "attempts": 0, "llm_usd": 0, "provider_calls": 0, "external_spend_usd": 0, "max_command_seconds": 0},
        "recovery": {"mode": "not_started", "owner": "agent", "next_action": "report verification result", "reason": None},
        "budget": {"max_minutes": 45, "max_attempts": 3, "max_llm_usd": 5, "provider_calls": 0, "external_spend_usd": 0},
        "evidence": {"checks": ["CI checkout", "exact head", "operations policy", "repository diff"], "last_error": None},
    }
    event = {"seq": 1, "ts": now, "task_id": state["task_id"], "event": "checkpoint", "step": state["step"], "result": "pass", "head_sha": args.head_sha, "next_action": state["next_action"]}
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        state_path = root / "state.json"
        events_path = root / "events.jsonl"
        state_path.write_text(json.dumps(state), encoding="utf-8")
        events_path.write_text(json.dumps(event) + "\n", encoding="utf-8")
        result = validate(POLICY_PATH, state_path, events_path, repository)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
