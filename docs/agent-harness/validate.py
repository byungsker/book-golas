from __future__ import annotations

import argparse
import datetime as datetime_module
import fnmatch
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "harness-policy.json"
SHA = re.compile(r"^[0-9a-f]{40}$")
BRANCH = re.compile(r"^(?:codex/)?(?:feature|fix|chore|refactor|docs|ci)/operations/1\.1\.0/[^/]+$")
SECRET = re.compile(r"(?:AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})")
SENSITIVE_KEY_PARTS = ("password", "token", "credential", "secret", "private_key", "api_key", "prompt", "response", "raw_provider_payload", "stdout", "stderr", "customer", "user", "account", "session", "email", "phone", "address", "device")
EVENT_KEYS = {"seq", "ts", "task_id", "event", "step", "result", "head_sha", "paths", "tool", "command_class", "target", "approval_id", "approval_status", "error_class", "next_action", "duration_seconds", "exit_code"}
RISKY_EVENTS = {"delete", "external_send", "provider_call", "commit", "push", "pr_create", "pr_merge", "deploy", "release"}
STATUSES = {"planned", "in_progress", "checkpointed", "ready_for_review", "blocked", "done", "aborted"}
ACTIVE_STATUSES = {"in_progress", "checkpointed", "ready_for_review"}
RECOVERY_MODES = {"not_started", "continue", "retry_once", "checkpoint_and_escalate", "human_required", "complete"}
OPERATIONS_ALLOWED_PATHS = [
    ".github/workflows/daily-nudge.yml",
    ".github/workflows/quality.yml",
    ".github/workflows/schema-check.yml",
    "README.md",
    "docs/**",
    "web/ADMIN_GUIDE.md",
    "web/package.json",
    "web/src/app/admin/**",
    "web/src/app/api/admin/**",
    "web/src/lib/**",
    "web/src/middleware.ts",
    "supabase/config.toml",
    "supabase/functions/**",
    "supabase/migrations/**",
]
READ_EXCLUDES = {".env", ".env.*", "**/.env", "**/.env.*", "node_modules/**", "**/node_modules/**", "*password*", "**/*password*", "*token*", "**/*token*", "*credential*", "**/*credential*", "*secret*", "**/*secret*", ".git/**"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sensitive_key(key: Any) -> bool:
    if not isinstance(key, str):
        return True
    lowered = key.lower()
    return any(part in lowered for part in SENSITIVE_KEY_PARTS)


def sensitive_value(value: Any, key: str = "") -> bool:
    if isinstance(value, dict):
        return any(sensitive_key(key_name) or sensitive_value(item, str(key_name)) for key_name, item in value.items())
    if isinstance(value, list):
        return any(sensitive_value(item, key) for item in value)
    if isinstance(value, str):
        return sensitive_key(key) or bool(SECRET.search(value))
    return False


def relative_paths(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) and item and not item.startswith("/") and "\x00" not in item and ".." not in Path(item).parts for item in value)


def parse_timestamp(value: Any, field: str, errors: list[str], required: bool = False) -> datetime_module.datetime | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value:
        errors.append(f"{field} must be an RFC3339 timestamp")
        return None
    try:
        parsed = datetime_module.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{field} must be an RFC3339 timestamp")
        return None
    if parsed.tzinfo is None:
        errors.append(f"{field} must include a timezone")
        return None
    return parsed.astimezone(datetime_module.timezone.utc)


def scope_matches_policy(scope: dict[str, Any], policy: dict[str, Any]) -> bool:
    roots = policy.get("capabilities", {}).get("scoped_write", {}).get("roots", [])
    include = scope.get("include", [])
    if not isinstance(roots, list) or not isinstance(include, list) or not include:
        return False
    return all(isinstance(path, str) and any(fnmatch.fnmatchcase(path, root) for root in roots if isinstance(root, str)) for path in include)


def paths_match_scope(paths: list[str], scope: dict[str, Any]) -> bool:
    include = scope.get("include", []) if isinstance(scope, dict) else []
    if not isinstance(include, list) or not include:
        return False
    return all(any(fnmatch.fnmatchcase(path, pattern) for pattern in include if isinstance(pattern, str)) for path in paths)


def matches_any(path: str, patterns: Any) -> bool:
    if not isinstance(patterns, list):
        return False
    normalized = path.lstrip("./")
    return any(isinstance(pattern, str) and (fnmatch.fnmatchcase(path, pattern) or fnmatch.fnmatchcase(normalized, pattern)) for pattern in patterns)


def path_allowed(path: str, scope: dict[str, Any], policy: dict[str, Any]) -> bool:
    return paths_match_scope([path], scope) and not matches_any(path, scope.get("exclude", [])) and not matches_any(path, policy.get("read_exclude", []))


def validate_policy(policy: Any, errors: list[str]) -> None:
    if not isinstance(policy, dict):
        errors.append("policy must be an object")
        return
    if policy.get("schema_version") != 1:
        errors.append("policy schema_version must be 1")
    expected_delivery = {"delivery_unit": "operations", "target_version": "1.1.0", "delivery_profile": "backend-service", "expected_base_branch": "main", "branch_policy_path": ".byungskerlab/branch-policy.json", "allowed_paths": OPERATIONS_ALLOWED_PATHS}
    if policy.get("delivery") != expected_delivery:
        errors.append("delivery contract does not match operations 1.1.0 backend-service main")
    permissions = policy.get("permissions", {})
    for name in ("delete", "external_send", "provider_calls", "hosted_mutation", "production_mutation", "release"):
        if not isinstance(permissions, dict) or permissions.get(name) != "disabled":
            errors.append(f"permission must be disabled: {name}")
    expected_limits = {"max_wall_minutes": 45, "max_attempts": 3, "max_llm_usd": 5, "max_provider_calls": 0, "max_external_spend_usd": 0, "max_command_seconds": 300}
    if policy.get("limits") != expected_limits:
        errors.append("runtime limits do not match the minimum contract")
    required_approvals = RISKY_EVENTS | {"credential_change", "signing_change", "hosted_database_change", "production_change", "payment_or_account_change", "workflow_or_policy_change"}
    if not isinstance(policy.get("approval_required"), list) or not required_approvals.issubset(set(policy["approval_required"])):
        errors.append("approval_required is incomplete")
    if set(policy.get("statuses", [])) != STATUSES:
        errors.append("status catalog is incomplete")
    if not isinstance(policy.get("event_catalog"), list) or not required_approvals.issubset(set(policy["event_catalog"])):
        errors.append("event catalog is incomplete")
    if policy.get("execution") != {"shell": False, "capture_output": True, "append_only_events": True}:
        errors.append("execution contract is incomplete")
    runtime = policy.get("runtime", {})
    if runtime != {"state_path": "docs/agent-harness/runtime/task-state.json", "event_log_path": "docs/agent-harness/runtime/events.jsonl", "runner": "docs/agent-harness/run.py", "resume": "docs/agent-harness/resume.py"}:
        errors.append("runtime paths do not match the harness repository")
    if not isinstance(policy.get("read_exclude"), list) or not READ_EXCLUDES.issubset(set(policy["read_exclude"])):
        errors.append("read exclusion contract is incomplete")
    capabilities = policy.get("capabilities", {})
    read_capability = capabilities.get("read", {}) if isinstance(capabilities, dict) else {}
    local_capability = capabilities.get("local_verify", {}) if isinstance(capabilities, dict) else {}
    if not isinstance(read_capability, dict) or read_capability.get("network") is not False:
        errors.append("read capability must be offline")
    if not isinstance(local_capability, dict) or local_capability.get("network") is not False or local_capability.get("production_target") is not False:
        errors.append("local verification must be offline and non-production")
    scoped_write = capabilities.get("scoped_write", {}) if isinstance(capabilities, dict) else {}
    if not isinstance(scoped_write, dict) or scoped_write.get("tool") != "apply_patch" or scoped_write.get("requires_scope_match") is not True or not isinstance(scoped_write.get("roots"), list) or not scoped_write["roots"]:
        errors.append("scoped write contract is incomplete")
    elif scoped_write.get("roots") != OPERATIONS_ALLOWED_PATHS:
        errors.append("scoped write roots do not match operations policy")


def validate_approvals(approvals: Any, errors: list[str]) -> dict[str, dict[str, Any]]:
    if not isinstance(approvals, list):
        errors.append("approvals must be an array")
        return {}
    records: dict[str, dict[str, Any]] = {}
    for number, approval in enumerate(approvals, 1):
        if not isinstance(approval, dict):
            errors.append(f"approval {number} must be an object")
            continue
        required = {"approval_id", "action", "target", "scope", "head_sha", "actor", "granted_at", "expires_at", "status", "consumed"}
        missing = sorted(required - set(approval))
        if missing:
            errors.append(f"approval {number} missing fields: {', '.join(missing)}")
            continue
        approval_id = approval.get("approval_id")
        if not isinstance(approval_id, str) or not approval_id or approval_id in records:
            errors.append(f"approval {number} has an invalid or duplicate approval_id")
        else:
            records[approval_id] = approval
        if not isinstance(approval.get("action"), str) or not approval.get("action"):
            errors.append(f"approval {number} action must be non-empty")
        if not isinstance(approval.get("target"), str) or not approval.get("target"):
            errors.append(f"approval {number} target must be non-empty")
        if not relative_paths(approval.get("scope")):
            errors.append(f"approval {number} scope must be relative path arrays")
        if not isinstance(approval.get("head_sha"), str) or not SHA.fullmatch(approval.get("head_sha", "")):
            errors.append(f"approval {number} head_sha is invalid")
        if not isinstance(approval.get("actor"), str) or not approval.get("actor"):
            errors.append(f"approval {number} actor must be non-empty")
        granted = parse_timestamp(approval.get("granted_at"), f"approval {number} granted_at", errors, True)
        expires = parse_timestamp(approval.get("expires_at"), f"approval {number} expires_at", errors, True)
        if granted and expires and expires <= granted:
            errors.append(f"approval {number} expires_at must be after granted_at")
        if approval.get("status") not in {"approved", "denied", "revoked"}:
            errors.append(f"approval {number} status is invalid")
        if not isinstance(approval.get("consumed"), bool):
            errors.append(f"approval {number} consumed must be boolean")
    return records


def validate_state(state: Any, policy: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    required = {"schema_version", "task_id", "objective", "status", "scope", "branch", "base_sha", "head_sha", "head_history", "started_at", "last_checkpoint_at", "step", "completed", "next_action", "blocked_by", "dirty_paths", "approvals", "usage", "recovery", "budget", "evidence"}
    if not isinstance(state, dict):
        errors.append("state must be an object")
        return {}
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
    if not isinstance(state.get("branch"), str) or not BRANCH.fullmatch(state.get("branch", "")):
        errors.append("branch must use the operations 1.1.0 work-branch format")
    for name in ("base_sha", "head_sha"):
        if not isinstance(state.get(name), str) or not SHA.fullmatch(state.get(name, "")):
            errors.append(f"{name} must be a 40-character lowercase SHA")
    head_history = state.get("head_history")
    if not isinstance(head_history, list) or not head_history:
        errors.append("head_history must be a non-empty SHA array")
    else:
        for number, head in enumerate(head_history, 1):
            if not isinstance(head, str) or not SHA.fullmatch(head):
                errors.append(f"head_history entry {number} is invalid")
        if state.get("base_sha") not in head_history or state.get("head_sha") not in head_history:
            errors.append("head_history must contain base_sha and head_sha")
    started = parse_timestamp(state.get("started_at"), "started_at", errors, state.get("status") in ACTIVE_STATUSES | {"done", "aborted"})
    parse_timestamp(state.get("last_checkpoint_at"), "last_checkpoint_at", errors, False)
    if state.get("status") == "planned" and state.get("started_at") is not None:
        errors.append("planned state cannot have started_at")
    for name in ("step", "next_action"):
        if not isinstance(state.get(name), str) or not state.get(name):
            errors.append(f"{name} must be non-empty")
    for name in ("completed", "blocked_by", "dirty_paths"):
        if not isinstance(state.get(name), list):
            errors.append(f"{name} must be an array")
    if isinstance(state.get("dirty_paths"), list) and not relative_paths(state["dirty_paths"]):
        errors.append("dirty_paths must contain relative paths")
    elif isinstance(state.get("dirty_paths"), list) and not all(path_allowed(path_value, scope, policy) for path_value in state["dirty_paths"]):
        errors.append("dirty_paths exceed the approved boundary")
    validate_approvals(state.get("approvals"), errors)
    usage = state.get("usage", {})
    limits = policy.get("limits", {})
    usage_limits = {"elapsed_seconds": limits.get("max_wall_minutes", 0) * 60, "attempts": limits.get("max_attempts"), "llm_usd": limits.get("max_llm_usd"), "provider_calls": limits.get("max_provider_calls"), "external_spend_usd": limits.get("max_external_spend_usd"), "max_command_seconds": limits.get("max_command_seconds")}
    if not isinstance(usage, dict):
        errors.append("usage must be an object")
    else:
        for name, limit in usage_limits.items():
            value = usage.get(name)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
                errors.append(f"usage.{name} must be a non-negative number")
            elif isinstance(limit, (int, float)) and value > limit:
                errors.append(f"usage.{name} exceeds policy")
    if started and state.get("status") in ACTIVE_STATUSES:
        elapsed = (datetime_module.datetime.now(datetime_module.timezone.utc) - started).total_seconds()
        if elapsed > usage_limits["elapsed_seconds"]:
            errors.append("active task exceeded wall-time policy")
    recovery = state.get("recovery", {})
    if not isinstance(recovery, dict) or recovery.get("mode") not in RECOVERY_MODES or not isinstance(recovery.get("owner"), str) or not recovery.get("owner") or not isinstance(recovery.get("next_action"), str) or not recovery.get("next_action"):
        errors.append("recovery must contain a valid mode, owner, and next_action")
    elif state.get("status") in {"blocked", "aborted"} and recovery.get("mode") not in {"checkpoint_and_escalate", "human_required"}:
        errors.append("blocked or aborted state must require human recovery")
    elif state.get("status") == "done" and recovery.get("mode") != "complete":
        errors.append("done state must use complete recovery mode")
    budget = state.get("budget", {})
    if not isinstance(budget, dict):
        errors.append("budget must be an object")
    else:
        budget_limits = {"max_minutes": "max_wall_minutes", "max_attempts": "max_attempts", "max_llm_usd": "max_llm_usd", "provider_calls": "max_provider_calls", "external_spend_usd": "max_external_spend_usd"}
        for state_key, policy_key in budget_limits.items():
            value = budget.get(state_key)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                errors.append(f"budget.{state_key} must be numeric")
            elif value > limits.get(policy_key, 0):
                errors.append(f"budget.{state_key} exceeds policy")
    if sensitive_value(state):
        errors.append("state contains sensitive fields or secret-like values")
    return state


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
    scope = state.get("scope", {})
    approval_records = validate_approvals(state.get("approvals", []), errors)
    allowed_events = set(policy.get("event_catalog", [])) if isinstance(policy.get("event_catalog"), list) else set()
    approval_required = set(policy.get("approval_required", [])) if isinstance(policy.get("approval_required"), list) else set()
    head_history = set(state.get("head_history", [])) if isinstance(state.get("head_history"), list) else set()
    expected_seq = 1
    previous_ts: datetime_module.datetime | None = None
    previous_head: str | None = None
    used_approvals: dict[str, int] = {}
    for number, line in enumerate(lines, 1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError as error:
            errors.append(f"event {number} is not valid JSON: {error.msg}")
            continue
        if not isinstance(event, dict):
            errors.append(f"event {number} must be an object")
            continue
        missing = {"seq", "ts", "task_id", "event", "result", "head_sha"} - set(event)
        if missing:
            errors.append(f"event {number} missing fields: {', '.join(sorted(missing))}")
        if set(event) - EVENT_KEYS:
            errors.append(f"event {number} contains unapproved fields")
        sequence = event.get("seq")
        if isinstance(sequence, bool) or not isinstance(sequence, int) or sequence != expected_seq:
            errors.append(f"event {number} sequence is not append-only")
        expected_seq += 1
        timestamp = parse_timestamp(event.get("ts"), f"event {number} ts", errors, True)
        if timestamp and previous_ts and timestamp < previous_ts:
            errors.append(f"event {number} timestamp moved backwards")
        if timestamp:
            previous_ts = timestamp
        if event.get("task_id") != task_id:
            errors.append(f"event {number} task_id does not match state")
        event_name = event.get("event")
        if not isinstance(event_name, str) or event_name not in allowed_events:
            errors.append(f"event {number} is not in the event catalog")
        if not isinstance(event.get("result"), str) or not event.get("result"):
            errors.append(f"event {number} result must be non-empty")
        head_sha = event.get("head_sha")
        if not isinstance(head_sha, str) or not SHA.fullmatch(head_sha):
            errors.append(f"event {number} head_sha is invalid")
        elif head_history and head_sha not in head_history:
            errors.append(f"event {number} head_sha is not in state head_history")
        if isinstance(head_sha, str):
            previous_head = head_sha
        if "paths" in event:
            paths = event.get("paths")
            if not relative_paths(paths):
                errors.append(f"event {number} paths must be relative")
            elif not all(path_allowed(path_value, scope, policy) for path_value in paths):
                errors.append(f"event {number} paths exceed the task scope")
        if "duration_seconds" in event:
            duration = event.get("duration_seconds")
            if isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration < 0:
                errors.append(f"event {number} duration_seconds is invalid")
            elif duration > policy.get("limits", {}).get("max_command_seconds", 0):
                errors.append(f"event {number} exceeded command duration policy")
        approval_id = event.get("approval_id")
        if event_name in approval_required:
            if event.get("approval_status") != "approved" or not isinstance(approval_id, str) or not approval_id or not isinstance(event.get("target"), str) or not event.get("target"):
                errors.append(f"event {number} records a risky action without approval")
            else:
                approval = approval_records.get(approval_id)
                if not approval:
                    errors.append(f"event {number} approval_id is not registered")
                else:
                    used_approvals[approval_id] = used_approvals.get(approval_id, 0) + 1
                    if approval.get("status") != "approved" or approval.get("action") != event_name or approval.get("target") != event.get("target") or approval.get("head_sha") != head_sha:
                        errors.append(f"event {number} approval does not bind action and head")
                    event_paths = event.get("paths", [])
                    if isinstance(event_paths, list) and not paths_match_scope(event_paths, {"include": approval.get("scope", [])}):
                        errors.append(f"event {number} approval does not bind scope")
                    granted = parse_timestamp(approval.get("granted_at"), f"approval {approval_id} granted_at", errors, True)
                    expires = parse_timestamp(approval.get("expires_at"), f"approval {approval_id} expires_at", errors, True)
                    if timestamp and granted and timestamp < granted:
                        errors.append(f"event {number} occurred before approval")
                    if timestamp and expires and timestamp > expires:
                        errors.append(f"event {number} occurred after approval expiry")
                    if approval.get("consumed") is not True:
                        errors.append(f"event {number} approval was not marked consumed")
        if "approval_status" in event and event.get("approval_status") not in {"approved", "denied"}:
            errors.append(f"event {number} approval_status is invalid")
        if sensitive_value(event):
            errors.append(f"event {number} contains sensitive fields or secret-like values")
    if previous_head and previous_head != state.get("head_sha"):
        errors.append("last event head_sha does not match state head_sha")
    for approval_id, approval in approval_records.items():
        if approval.get("consumed") is True and used_approvals.get(approval_id, 0) != 1:
            errors.append(f"consumed approval {approval_id} must have exactly one event")


def validate_repository(repo: Path, state: dict[str, Any], policy: dict[str, Any], errors: list[str]) -> None:
    if not repo.is_dir():
        errors.append("repository path is not a directory")
        return
    base_sha = state.get("base_sha")
    head_sha = state.get("head_sha")
    if not isinstance(base_sha, str) or not SHA.fullmatch(base_sha) or not isinstance(head_sha, str) or not SHA.fullmatch(head_sha) or {base_sha, head_sha} == {"0" * 40}:
        errors.append("repository diff validation requires non-zero exact SHAs")
        return
    try:
        actual_head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=False)
        if actual_head.returncode != 0 or actual_head.stdout.strip() != head_sha:
            errors.append("state head_sha does not match repository HEAD")
        base_object = subprocess.run(["git", "rev-parse", f"{base_sha}^{{commit}}"], cwd=repo, capture_output=True, text=True, check=False)
        if base_object.returncode != 0:
            errors.append("state base_sha is not a repository commit")
        ancestry = subprocess.run(["git", "merge-base", "--is-ancestor", base_sha, head_sha], cwd=repo, capture_output=True, text=True, check=False)
        if ancestry.returncode != 0:
            errors.append("state base_sha is not an ancestor of head_sha")
        branch = subprocess.run(["git", "branch", "--show-current"], cwd=repo, capture_output=True, text=True, check=False)
        if branch.returncode == 0 and branch.stdout.strip() and branch.stdout.strip() != state.get("branch"):
            errors.append("state branch does not match repository branch")
        branch_policy = load_json(repo / ".byungskerlab/branch-policy.json")
        operations = branch_policy.get("delivery_units", {}).get("operations", {})
        if operations.get("profile") != "backend-service" or operations.get("active_versions") != ["1.1.0"] or operations.get("production_branch") != "main" or operations.get("work_bases") != ["main"] or operations.get("allowed_paths") != OPERATIONS_ALLOWED_PATHS:
            errors.append("repository operations policy does not match harness contract")
        release_lines = load_json(repo / ".byungskerlab/release-lines.json")
        if release_lines.get("delivery_units", {}).get("operations", {}).get("active_versions") != ["1.1.0"]:
            errors.append("repository operations release line does not match harness contract")
        status = subprocess.run(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=repo, capture_output=True, text=True, check=False)
        if status.returncode != 0:
            errors.append("repository status could not be read")
        else:
            status_paths = []
            for line in status.stdout.splitlines():
                if len(line) >= 4:
                    status_paths.append(line[3:].split(" -> ")[-1])
            for path_value in status_paths:
                if not relative_paths([path_value]) or not path_allowed(path_value, state.get("scope", {}), policy):
                    errors.append(f"working tree path is outside the approved boundary: {path_value}")
            declared_paths = state.get("dirty_paths", [])
            if isinstance(declared_paths, list) and set(status_paths) != set(declared_paths):
                errors.append("state dirty_paths do not match repository status")
        result = subprocess.run(["git", "diff", "--name-only", f"{base_sha}..{head_sha}", "--"], cwd=repo, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            errors.append("repository diff could not be read")
            return
        paths = [line for line in result.stdout.splitlines() if line]
        scope = state.get("scope", {})
        for path_value in paths:
            if not relative_paths([path_value]) or not path_allowed(path_value, scope, policy):
                errors.append(f"repository diff path is outside the approved boundary: {path_value}")
        check = subprocess.run(["git", "diff", "--check", f"{base_sha}..{head_sha}", "--"], cwd=repo, capture_output=True, text=True, check=False)
        if check.returncode != 0:
            errors.append("repository diff check failed")
        content = subprocess.run(["git", "diff", "--no-ext-diff", "--unified=0", f"{base_sha}..{head_sha}", "--"], cwd=repo, capture_output=True, text=True, check=False)
        if content.returncode != 0:
            errors.append("repository content diff could not be read")
        elif SECRET.search(content.stdout):
            errors.append("repository diff contains a secret-like value")
        for command in (["git", "diff", "--no-ext-diff", "--unified=0", "--"], ["git", "diff", "--cached", "--no-ext-diff", "--unified=0", "--"]):
            working_content = subprocess.run(command, cwd=repo, capture_output=True, text=True, check=False)
            if working_content.returncode == 0 and SECRET.search(working_content.stdout):
                errors.append("working tree diff contains a secret-like value")
    except OSError:
        errors.append("git is unavailable for repository diff validation")


def validate(policy_path: Path, state_path: Path, events_path: Path, repo: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    try:
        policy = load_json(policy_path)
        validate_policy(policy, errors)
        state = load_json(state_path)
        state = validate_state(state, policy if isinstance(policy, dict) else {}, errors)
        validate_events(events_path, state, policy if isinstance(policy, dict) else {}, errors)
        if repo:
            validate_repository(repo, state, policy if isinstance(policy, dict) else {}, errors)
    except (OSError, json.JSONDecodeError) as error:
        errors.append(f"input unreadable: {error}")
    except Exception as error:
        errors.append(f"structured validation failed: {type(error).__name__}")
    if errors:
        return {"status": "fail", "errors": errors}
    checks = ["policy", "state", "event-log", "privacy", "limits", "approval-boundary", "sequence-and-head"]
    if repo:
        checks.append("repository-diff")
    return {"status": "pass", "checks": checks}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=POLICY_PATH)
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--repo", type=Path)
    args = parser.parse_args()
    result = validate(args.policy, args.state, args.events, args.repo)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
