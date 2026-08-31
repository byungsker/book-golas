from __future__ import annotations

import argparse
import fnmatch
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "harness-policy.json"
SHA = re.compile(r"^[0-9a-f]{40}$")
SECRET = re.compile(r"(?:AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})")
SENSITIVE_KEY_PARTS = ("password", "token", "credential", "secret", "private_key", "api_key", "prompt", "response", "raw_provider_payload", "stdout", "stderr")
EVENT_KEYS = {"ts", "task_id", "event", "step", "result", "head_sha", "paths", "tool", "command_class", "exit_code", "approval_id", "approval_status", "error_class", "next_action", "duration_seconds"}
RISKY_EVENTS = {"delete", "external_send", "provider_call", "commit", "push", "pr_create", "pr_merge", "deploy", "release"}
STATUSES = {"planned", "in_progress", "checkpointed", "ready_for_review", "blocked", "done", "aborted"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sensitive_key(key: str) -> bool:
    lowered = key.lower()
    return any(part in lowered for part in SENSITIVE_KEY_PARTS)


def sensitive_value(value: Any, key: str = "") -> bool:
    if isinstance(value, dict):
        return any(sensitive_key(key_name) or sensitive_value(item, key_name) for key_name, item in value.items())
    if isinstance(value, list):
        return any(sensitive_value(item, key) for item in value)
    if isinstance(value, str):
        return sensitive_key(key) or bool(SECRET.search(value))
    return False


def relative_paths(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) and item and not item.startswith("/") and ".." not in Path(item).parts for item in value)


def scope_matches_policy(scope: dict[str, Any], policy: dict[str, Any]) -> bool:
    roots = policy.get("capabilities", {}).get("scoped_write", {}).get("roots", [])
    include = scope.get("include", [])
    return bool(include) and all(any(fnmatch.fnmatchcase(path, root) for root in roots) for path in include)


def paths_match_scope(paths: list[str], scope: dict[str, Any]) -> bool:
    include = scope.get("include", [])
    return all(any(fnmatch.fnmatchcase(path, pattern) for pattern in include) for path in paths)


def validate_policy(policy: Any, errors: list[str]) -> None:
    if not isinstance(policy, dict):
        errors.append("policy must be an object")
        return
    if policy.get("schema_version") != 1:
        errors.append("policy schema_version must be 1")
    delivery = policy.get("delivery")
    expected_delivery = {"delivery_unit": "operations", "target_version": "1.1.0", "delivery_profile": "backend-service", "expected_base_branch": "main"}
    if delivery != expected_delivery:
        errors.append("delivery contract does not match operations 1.1.0 backend-service main")
    permissions = policy.get("permissions", {})
    for name in ("delete", "external_send", "provider_calls", "hosted_mutation", "production_mutation", "release"):
        if permissions.get(name) != "disabled":
            errors.append(f"permission must be disabled: {name}")
    limits = policy.get("limits", {})
    expected_limits = {"max_wall_minutes": 45, "max_attempts": 3, "max_llm_usd": 5, "max_provider_calls": 0, "max_external_spend_usd": 0, "max_command_seconds": 300}
    if limits != expected_limits:
        errors.append("runtime limits do not match the minimum contract")
    if not isinstance(policy.get("approval_required"), list) or not set(policy["approval_required"]).issuperset(RISKY_EVENTS | {"credential_change", "signing_change", "hosted_database_change", "production_change", "payment_or_account_change", "workflow_or_policy_change"}):
        errors.append("approval_required is incomplete")
    if set(policy.get("statuses", [])) != STATUSES:
        errors.append("status catalog is incomplete")


def validate_state(state: Any, policy: dict[str, Any], errors: list[str]) -> None:
    required = {"schema_version", "task_id", "objective", "status", "scope", "branch", "base_sha", "head_sha", "step", "completed", "next_action", "blocked_by", "dirty_paths", "approvals", "budget", "evidence"}
    if not isinstance(state, dict):
        errors.append("state must be an object")
        return
    missing = sorted(required - set(state))
    if missing:
        errors.append(f"state missing fields: {', '.join(missing)}")
    if state.get("schema_version") != 1:
        errors.append("state schema_version must be 1")
    if not isinstance(state.get("task_id"), str) or not state.get("task_id"):
        errors.append("task_id must be non-empty")
    if state.get("status") not in STATUSES:
        errors.append("state status is invalid")
    if not isinstance(state.get("objective"), str) or not state.get("objective"):
        errors.append("objective must be non-empty")
    scope = state.get("scope", {})
    if not isinstance(scope, dict) or not relative_paths(scope.get("include")) or not relative_paths(scope.get("exclude")):
        errors.append("scope include/exclude must be relative path arrays")
    elif not scope_matches_policy(scope, policy):
        errors.append("scope include paths exceed the policy write roots")
    if not isinstance(state.get("branch"), str) or not state.get("branch", "").startswith("codex/"):
        errors.append("branch must use the codex prefix")
    for name in ("base_sha", "head_sha"):
        if not isinstance(state.get(name), str) or not SHA.fullmatch(state.get(name, "")):
            errors.append(f"{name} must be a 40-character lowercase SHA")
    for name in ("step", "next_action"):
        if not isinstance(state.get(name), str) or not state.get(name):
            errors.append(f"{name} must be non-empty")
    for name in ("completed", "blocked_by", "dirty_paths", "approvals"):
        if not isinstance(state.get(name), list):
            errors.append(f"{name} must be an array")
    budget = state.get("budget", {})
    limits = policy.get("limits", {})
    if not isinstance(budget, dict):
        errors.append("budget must be an object")
    else:
        checks = {
            "max_minutes": "max_wall_minutes",
            "max_attempts": "max_attempts",
            "max_llm_usd": "max_llm_usd",
            "provider_calls": "max_provider_calls",
            "external_spend_usd": "max_external_spend_usd",
        }
        for state_key, policy_key in checks.items():
            value = budget.get(state_key)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                errors.append(f"budget.{state_key} must be numeric")
            elif value > limits[policy_key]:
                errors.append(f"budget.{state_key} exceeds policy")
    if sensitive_value(state):
        errors.append("state contains sensitive fields or secret-like values")


def validate_events(path: Path, state: dict[str, Any], policy: dict[str, Any], errors: list[str]) -> None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        errors.append(f"event log unreadable: {error}")
        return
    if not lines:
        errors.append("event log must contain at least one event")
        return
    task_id = state.get("task_id")
    for number, line in enumerate(lines, 1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError as error:
            errors.append(f"event {number} is not valid JSON: {error.msg}")
            continue
        if not isinstance(event, dict):
            errors.append(f"event {number} must be an object")
            continue
        missing = {"ts", "task_id", "event", "result"} - set(event)
        if missing:
            errors.append(f"event {number} missing fields: {', '.join(sorted(missing))}")
        if event.get("task_id") != task_id:
            errors.append(f"event {number} task_id does not match state")
        if set(event) - EVENT_KEYS:
            errors.append(f"event {number} contains unapproved fields")
        approval_required = set(policy.get("approval_required", []))
        if event.get("event") in approval_required and (event.get("approval_status") != "approved" or not event.get("approval_id")):
            errors.append(f"event {number} records a risky action without approval")
        if "paths" in event and not relative_paths(event["paths"]):
            errors.append(f"event {number} paths must be relative")
        elif "paths" in event and not paths_match_scope(event["paths"], state.get("scope", {})):
            errors.append(f"event {number} paths exceed the task scope")
        if "head_sha" in event and not SHA.fullmatch(event["head_sha"]):
            errors.append(f"event {number} head_sha is invalid")
        if sensitive_value(event):
            errors.append(f"event {number} contains sensitive fields or secret-like values")


def validate(policy_path: Path, state_path: Path, events_path: Path) -> dict[str, Any]:
    errors: list[str] = []
    try:
        policy = load_json(policy_path)
    except (OSError, json.JSONDecodeError) as error:
        return {"status": "fail", "errors": [f"policy unreadable: {error}"]}
    validate_policy(policy, errors)
    try:
        state = load_json(state_path)
    except (OSError, json.JSONDecodeError) as error:
        return {"status": "fail", "errors": [f"state unreadable: {error}"]}
    validate_state(state, policy, errors)
    validate_events(events_path, state, policy, errors)
    if errors:
        return {"status": "fail", "errors": errors}
    return {"status": "pass", "checks": ["policy", "state", "event-log", "privacy", "limits", "approval-boundary"]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=POLICY_PATH)
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    args = parser.parse_args()
    result = validate(args.policy, args.state, args.events)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
