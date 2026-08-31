from __future__ import annotations

import argparse
import datetime as datetime_module
import json
import os
import shlex
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
POLICY_PATH = ROOT / "harness-policy.json"
FORBIDDEN_ARGUMENTS = ("--fix", "--write", "--delete", "--deploy", "--publish", "--push", "--force", "--prod", "--allow-net", "--allow-all", "--allow-run", "--network", "--output", "--web", "production", "curl", "wget", "nc", "telnet")

from validate import load_json, matches_any, validate


def timestamp() -> str:
    return datetime_module.datetime.now(datetime_module.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_timestamp(value: str) -> datetime_module.datetime:
    return datetime_module.datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(datetime_module.timezone.utc)


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())
        temporary_path = Path(output.name)
    os.replace(temporary_path, path)


def append_event(path: Path, event: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as output:
        output.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
        output.flush()
        os.fsync(output.fileno())


def next_sequence(path: Path) -> int:
    if not path.exists():
        return 1
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        return 1
    last = json.loads(lines[-1])
    sequence = last.get("seq")
    if isinstance(sequence, bool) or not isinstance(sequence, int):
        raise ValueError("event sequence is invalid")
    return sequence + 1


def lexical_path(path: Path) -> Path:
    return Path(os.path.abspath(os.fspath(path)))


def anchored_path(path: Path, expected: Path) -> bool:
    try:
        return lexical_path(path) == expected and path.resolve() == expected
    except (OSError, RuntimeError):
        return False


def command_path_safe(item: str, repository: Path) -> bool:
    if item.startswith("-") or item.startswith("!") or ("/" not in item and not item.startswith(".")):
        return True
    value = Path(item)
    if ".." in value.parts:
        return False
    current = repository
    for part in value.parts:
        current /= part
        if current.is_symlink():
            return False
    try:
        return (repository / value).resolve().is_relative_to(repository)
    except (OSError, RuntimeError):
        return False


def command_allowed(command: list[str], command_class: str, policy: dict[str, Any], repository: Path) -> tuple[bool, list[str], str]:
    capabilities = policy.get("capabilities", {})
    capability = capabilities.get(command_class, {}) if isinstance(capabilities, dict) else {}
    allowed = capability.get("commands", []) if isinstance(capability, dict) else []
    if not command or not isinstance(command[0], str):
        return False, command, "command is empty"
    if any(not isinstance(item, str) or "\x00" in item or item.startswith("/") for item in command):
        return False, command, "absolute or invalid command argument"
    if any(not command_path_safe(item, repository) for item in command[1:]):
        return False, command, "command operand is outside the repository or uses a symlink"
    if any(any(forbidden in item.lower() for forbidden in FORBIDDEN_ARGUMENTS) for item in command):
        return False, command, "mutation-like command argument is denied"
    matched = False
    for pattern in allowed:
        try:
            expected = shlex.split(pattern)
        except ValueError:
            continue
        if command[:len(expected)] == expected:
            matched = True
            break
    if not matched:
        return False, command, "command is outside the policy allowlist"
    excluded = policy.get("read_exclude", [])
    for item in command[1:]:
        if not item.startswith("!") and matches_any(item, excluded):
            return False, command, "command argument matches a read exclusion"
    safe_command = list(command)
    if command_class == "read" and command[0] == "rg":
        for pattern in excluded:
            safe_command.extend(["--glob", f"!{pattern}"])
    return True, safe_command, ""


def event(task_id: str, sequence: int, event_name: str, step: str, result: str, head_sha: str, **extra: Any) -> dict[str, Any]:
    value = {"seq": sequence, "ts": timestamp(), "task_id": task_id, "event": event_name, "step": step, "result": result, "head_sha": head_sha}
    value.update(extra)
    return value


def fail(message: str) -> int:
    print(json.dumps({"status": "fail", "error": message}, ensure_ascii=False))
    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=POLICY_PATH)
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--command-class", choices=("read", "local_verify", "github_status"), required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    try:
        repository = args.repo.resolve()
        expected_repository = ROOT.parent.parent.resolve()
        expected_policy = POLICY_PATH.resolve()
        expected_state = expected_repository / "docs/agent-harness/runtime/task-state.json"
        expected_events = expected_repository / "docs/agent-harness/runtime/events.jsonl"
    except (OSError, RuntimeError):
        return fail("harness paths could not be resolved")
    if not anchored_path(args.repo, expected_repository):
        return fail("repository path is not the harness repository")
    if not anchored_path(args.policy, expected_policy):
        return fail("policy path is not the harness policy")
    if not anchored_path(args.state, expected_state):
        return fail("state path is not the policy runtime state path")
    if not anchored_path(args.events, expected_events):
        return fail("event path is not the policy runtime event path")
    try:
        policy = load_json(args.policy)
        state = load_json(args.state)
    except (OSError, json.JSONDecodeError) as error:
        return fail(f"input unreadable: {error}")
    if not isinstance(policy, dict) or not isinstance(state, dict):
        return fail("policy and state must be objects")
    args.events.parent.mkdir(parents=True, exist_ok=True)
    if not args.events.exists() or not args.events.read_text(encoding="utf-8").strip():
        try:
            append_event(args.events, event(state["task_id"], 1, "checkpoint", "initialization", "pass", state["head_sha"], next_action="run command"))
        except (KeyError, OSError):
            return fail("event log could not be initialized")
    if state["status"] in {"blocked", "aborted", "done"}:
        return fail("state requires human recovery or is already complete")
    initial = validate(args.policy, args.state, args.events, args.repo)
    if initial["status"] != "pass":
        return fail("initial state validation failed")
    allowed, safe_command, reason = command_allowed(command, args.command_class, policy, repository)
    if not allowed:
        return fail(reason)
    limits = policy["limits"]
    usage = state["usage"]
    started_at = state.get("started_at")
    now = datetime_module.datetime.now(datetime_module.timezone.utc)
    if started_at is None:
        started = now
        state["started_at"] = started.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        try:
            started = parse_timestamp(started_at)
        except (TypeError, ValueError):
            return fail("state started_at is invalid")
    elapsed = max(0.0, (now - started).total_seconds())
    attempts = usage["attempts"] + 1
    if attempts > limits["max_attempts"]:
        return fail("attempt limit exceeded")
    if elapsed > limits["max_wall_minutes"] * 60:
        return fail("wall-time limit exceeded")
    command_timeout = min(limits["max_command_seconds"], max(0.01, limits["max_wall_minutes"] * 60 - elapsed))
    usage["attempts"] = attempts
    usage["elapsed_seconds"] = elapsed
    state["status"] = "in_progress"
    state["recovery"] = {"mode": "retry_once", "owner": "agent", "next_action": "wait for command result", "reason": None}
    state["last_checkpoint_at"] = timestamp()
    write_json(args.state, state)
    try:
        sequence = next_sequence(args.events)
        append_event(args.events, event(state["task_id"], sequence, "command_start", state["step"], "started", state["head_sha"], tool=safe_command[0], command_class=args.command_class, next_action="wait for command result"))
    except (OSError, ValueError, KeyError):
        return fail("command start could not be recorded")
    started_command = time.monotonic()
    timed_out = False
    exit_code = 127
    error_class = None
    try:
        process = subprocess.Popen(safe_command, cwd=args.repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
        try:
            process.communicate(timeout=command_timeout)
            exit_code = process.returncode
        except subprocess.TimeoutExpired:
            timed_out = True
            error_class = "wall_timeout" if command_timeout < limits["max_command_seconds"] else "timeout"
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate()
            exit_code = 124
    except OSError:
        error_class = "spawn_error"
    duration = time.monotonic() - started_command
    finished_at = datetime_module.datetime.now(datetime_module.timezone.utc)
    usage["elapsed_seconds"] = max(usage["elapsed_seconds"], (finished_at - started).total_seconds())
    usage["max_command_seconds"] = max(usage["max_command_seconds"], duration)
    passed = exit_code == 0 and not timed_out and error_class is None
    result = "pass" if passed else "fail"
    next_action = "continue" if passed else "inspect command result before one retry"
    try:
        sequence = next_sequence(args.events)
        append_event(args.events, event(state["task_id"], sequence, "command_end", state["step"], result, state["head_sha"], tool=safe_command[0], command_class=args.command_class, exit_code=exit_code, error_class=error_class, duration_seconds=duration, next_action=next_action))
    except (OSError, ValueError, KeyError):
        return fail("command result could not be recorded")
    wall_timeout = error_class == "wall_timeout"
    state["status"] = "blocked" if wall_timeout else "checkpointed"
    state["last_checkpoint_at"] = timestamp()
    state["next_action"] = next_action
    state["blocked_by"] = [] if passed else [error_class or f"exit_{exit_code}"]
    state["recovery"] = {"mode": "continue" if passed else ("checkpoint_and_escalate" if wall_timeout or attempts >= limits["max_attempts"] else "retry_once"), "owner": "agent" if passed else "human", "next_action": next_action, "reason": error_class}
    write_json(args.state, state)
    final = validate(args.policy, args.state, args.events, args.repo)
    output = {"status": "pass" if passed and final["status"] == "pass" else "fail", "exit_code": exit_code, "duration_seconds": round(duration, 3), "validation": final["status"]}
    print(json.dumps(output, ensure_ascii=False))
    return 0 if output["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
