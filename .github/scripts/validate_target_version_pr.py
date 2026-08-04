#!/usr/bin/env python3
"""Fail-closed validation of branch, base, PR metadata, and active version."""

from __future__ import annotations

import base64
import fnmatch
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any, Callable


SEMVER = r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)"
WORK_RE = re.compile(
    rf"^(?P<type>feature|fix|chore|refactor|docs|ci|migration|sync)/"
    rf"(?P<unit>[a-z0-9][a-z0-9-]*)/(?P<version>{SEMVER})/"
    r"(?P<scope>[A-Za-z0-9][A-Za-z0-9._-]*)$"
)
PROMOTION_RE = re.compile(
    rf"^(?P<type>release|hotfix)/"
    rf"(?P<unit>[a-z0-9][a-z0-9-]*)/(?P<version>{SEMVER})$"
)
METADATA_KEYS = (
    "Target-Delivery-Unit",
    "Target-Version",
    "Delivery-Profile",
)


class PolicyError(ValueError):
    pass


def load_config(path: Path) -> dict[str, Any]:
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        raise PolicyError(f"cannot load policy config {path}: {exc}") from exc
    if config.get("schema_version") != 1:
        raise PolicyError("policy config schema_version must be 1")
    if not isinstance(config.get("delivery_units"), dict):
        raise PolicyError("policy config delivery_units must be an object")
    return config


def load_release_registry(path: Path) -> dict[str, Any]:
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        raise PolicyError(f"cannot load release registry {path}: {exc}") from exc
    if registry.get("schema_version") != 1:
        raise PolicyError("release registry schema_version must be 1")
    if not isinstance(registry.get("delivery_units"), dict):
        raise PolicyError("release registry delivery_units must be an object")
    return registry


def read_metadata(body: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for key in METADATA_KEYS:
        values = re.findall(
            rf"(?mi)^[ \t]*{re.escape(key)}[ \t]*:[ \t]*(\S.*?)[ \t]*$",
            body,
        )
        if len(values) != 1:
            raise PolicyError(
                f"{key} must appear exactly once with a value; found {len(values)}"
            )
        result[key] = values[0].strip()
    return result


def read_changed_files(encoded: str) -> list[str]:
    if not encoded:
        raise PolicyError("missing changed-file evidence")
    try:
        files = json.loads(base64.b64decode(encoded, validate=True))
    except (ValueError, json.JSONDecodeError) as exc:
        raise PolicyError("changed-file evidence is malformed") from exc
    if not isinstance(files, list) or not files or not all(
        isinstance(path, str) and path for path in files
    ):
        raise PolicyError("changed-file evidence must be a non-empty string array")
    return files


def single_metadata(body: str, key: str) -> str:
    values = re.findall(
        rf"(?mi)^[ \t]*{re.escape(key)}[ \t]*:[ \t]*(\S.*?)[ \t]*$",
        body,
    )
    if len(values) != 1:
        raise PolicyError(f"{key} must appear exactly once; found {len(values)}")
    return values[0].strip()


def validate(
    config: dict[str, Any],
    head: str,
    base: str,
    body: str,
    changed_files: list[str],
    release_registry: dict[str, Any],
    ancestry_checker: Callable[[str], bool] | None = None,
) -> str:
    metadata = read_metadata(body)
    for actor in config.get("allowed_actor_prefixes", ["codex"]):
        marker = f"{actor}/"
        if head.startswith(marker):
            head = head[len(marker) :]
            break

    branch = WORK_RE.fullmatch(head)
    promotion = PROMOTION_RE.fullmatch(head)
    parsed = branch or promotion
    if parsed is None:
        raise PolicyError(
            "head must be [codex/]<type>/<unit>/<x.y.z>/<scope> or "
            "[codex/](release|hotfix)/<unit>/<x.y.z>"
        )

    branch_type = parsed.group("type")
    unit = parsed.group("unit")
    version = parsed.group("version")
    policy = config["delivery_units"].get(unit)
    if not isinstance(policy, dict):
        raise PolicyError(f"unknown delivery unit: {unit}")
    profile = policy.get("profile")
    mode = policy.get("mode")
    active = policy.get("active_versions")
    version_source = policy.get("target_version_source")
    if mode not in {"version-line", "continuous"}:
        raise PolicyError(f"invalid mode for {unit}: {mode!r}")
    if not isinstance(active, list) or version not in active:
        raise PolicyError(
            f"target version {version} is not active for {unit}; active={active!r}"
        )
    if (
        not isinstance(version_source, str)
        or not version_source.strip()
        or version_source.lower().startswith("pending")
    ):
        raise PolicyError(
            f"delivery unit {unit} has no authoritative target_version_source"
        )
    registry_unit = release_registry["delivery_units"].get(unit)
    if not isinstance(registry_unit, dict):
        raise PolicyError(f"release registry has no delivery unit {unit}")
    registry_versions = registry_unit.get("active_versions")
    if registry_versions != active:
        raise PolicyError(
            f"active version source mismatch for {unit}: "
            f"policy={active!r}, registry={registry_versions!r}"
        )
    allowed_paths = policy.get("allowed_paths")
    if not isinstance(allowed_paths, list) or not allowed_paths:
        raise PolicyError(f"delivery unit {unit} has no allowed_paths policy")
    invalid_paths = [
        path
        for path in changed_files
        if path.startswith("/")
        or ".." in Path(path).parts
        or not any(fnmatch.fnmatchcase(path, pattern) for pattern in allowed_paths)
    ]
    if invalid_paths:
        raise PolicyError(
            f"changed paths are outside delivery unit {unit}: "
            + ", ".join(invalid_paths[:5])
        )

    sync_only_paths = policy.get("sync_only_paths", [])
    if not isinstance(sync_only_paths, list) or not all(
        isinstance(pattern, str) and pattern for pattern in sync_only_paths
    ):
        raise PolicyError(f"delivery unit {unit} has invalid sync_only_paths policy")
    restricted_paths = [
        path
        for path in changed_files
        if any(
            fnmatch.fnmatchcase(path, pattern)
            for pattern in sync_only_paths
        )
    ]
    if restricted_paths:
        if branch_type != "sync":
            raise PolicyError(
                f"sync-only paths require a sync branch for {unit}: "
                + ", ".join(restricted_paths[:5])
            )
        mixed_paths = [path for path in changed_files if path not in restricted_paths]
        if mixed_paths:
            raise PolicyError(
                f"sync-only paths cannot be mixed with other changes for {unit}: "
                + ", ".join(mixed_paths[:5])
            )

    expected = {
        "Target-Delivery-Unit": unit,
        "Target-Version": version,
        "Delivery-Profile": profile,
    }
    for key, value in expected.items():
        if metadata[key] != value:
            raise PolicyError(
                f"{key} mismatch: observed {metadata[key]!r}, expected {value!r}"
            )

    production = policy.get("production_branch", "main")
    if promotion:
        promotion_sources = registry_unit.get("promotion_sources")
        source = (
            promotion_sources.get(branch_type, {}).get(version)
            if isinstance(promotion_sources, dict)
            else None
        )
        if not isinstance(source, dict):
            raise PolicyError(
                f"no approved {branch_type} promotion source for {unit} {version}"
            )
        source_branch = source.get("branch")
        source_sha = source.get("sha")
        if (
            not isinstance(source_branch, str)
            or not source_branch
            or not isinstance(source_sha, str)
            or re.fullmatch(r"[0-9a-f]{40}", source_sha) is None
        ):
            raise PolicyError(f"approved {branch_type} source is malformed")
        observed_source_sha = single_metadata(body, "Promotion-Source-SHA")
        if observed_source_sha != source_sha:
            raise PolicyError(
                "Promotion-Source-SHA mismatch: "
                f"observed {observed_source_sha!r}, expected {source_sha!r}"
            )
        if ancestry_checker is None or not ancestry_checker(source_sha):
            raise PolicyError(
                f"promotion head is not a descendant of {source_branch} "
                f"at {source_sha}"
            )
        if base != production:
            raise PolicyError(
                f"{branch_type} base mismatch: observed {base!r}, expected {production!r}"
            )
    elif branch_type == "sync":
        allowed = policy.get("sync_bases", ["dev", f"version/{unit}/{version}"])
        if base not in allowed:
            raise PolicyError(
                f"sync base mismatch: observed {base!r}, expected one of {allowed!r}"
            )
    elif mode == "continuous":
        work_bases = policy.get("work_bases", [production])
        if base not in work_bases:
            raise PolicyError(
                f"continuous base mismatch: observed {base!r}, "
                f"expected one of {work_bases!r}"
            )
    else:
        version_base = f"version/{unit}/{version}"
        release_base = f"release/{unit}/{version}"
        integration_prefix = f"integration/{unit}/{version}/"
        allowed = base == version_base
        allowed = allowed or (branch_type == "fix" and base == release_base)
        allowed = allowed or base.startswith(integration_prefix)
        if not allowed:
            raise PolicyError(
                f"version-line base mismatch: observed {base!r}, "
                f"expected {version_base!r}"
            )

    return (
        f"target-version gate passed: unit={unit} profile={profile} "
        f"version={version}"
    )


def github_ancestry_checker(source_sha: str) -> bool:
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    head_sha = os.environ.get("PR_HEAD_SHA", "")
    token = os.environ.get("GH_TOKEN", "")
    if (
        re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) is None
        or re.fullmatch(r"[0-9a-f]{40}", head_sha) is None
        or not token
    ):
        return False
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repository}/compare/{source_sha}...{head_sha}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.load(response)
    except (OSError, ValueError):
        return False
    return (
        payload.get("status") in {"ahead", "identical"}
        and payload.get("merge_base_commit", {}).get("sha") == source_sha
    )


def main() -> int:
    try:
        config = load_config(Path(".byungskerlab/branch-policy.json"))
        sources = {
            unit.get("target_version_source")
            for unit in config["delivery_units"].values()
            if isinstance(unit, dict)
        }
        if len(sources) != 1:
            raise PolicyError("all delivery units must use one release registry")
        source_path = next(iter(sources))
        if not isinstance(source_path, str):
            raise PolicyError("release registry path is missing")
        result = validate(
            config,
            os.environ["PR_HEAD_REF"],
            os.environ["PR_BASE_REF"],
            os.environ.get("PR_BODY", ""),
            read_changed_files(os.environ.get("PR_CHANGED_FILES_B64", "")),
            load_release_registry(Path(source_path)),
            github_ancestry_checker,
        )
    except (KeyError, PolicyError) as exc:
        print(f"target-version gate failed: {exc}", file=sys.stderr)
        return 1
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
