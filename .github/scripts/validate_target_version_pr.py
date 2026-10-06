#!/usr/bin/env python3
"""Fail-closed validation of branch, base, PR metadata, and active version."""

from __future__ import annotations

import base64
import fnmatch
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable


SEMVER = r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)"
SHA_RE = re.compile(r"[0-9a-f]{40}")
SHA256_RE = re.compile(r"[0-9a-f]{64}")
MAX_EVIDENCE_BYTES = 262144
WORK_RE = re.compile(
    rf"^(?P<type>feature|fix|chore|refactor|docs|ci|migration|sync)/"
    rf"(?P<unit>[a-z0-9][a-z0-9_-]*)/(?P<version>{SEMVER})/"
    r"(?P<scope>[A-Za-z0-9][A-Za-z0-9._-]*)$"
)
PROMOTION_RE = re.compile(
    rf"^(?P<type>release|hotfix)/"
    rf"(?P<unit>[a-z0-9][a-z0-9_-]*)/(?P<version>{SEMVER})$"
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
    if not isinstance(config, dict):
        raise PolicyError("policy config must be an object")
    if config.get("schema_version") not in {1, 2}:
        raise PolicyError("policy config schema_version must be 1 or 2")
    if not isinstance(config.get("delivery_units"), dict):
        raise PolicyError("policy config delivery_units must be an object")
    return config


def load_release_registry(path: Path) -> dict[str, Any]:
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        raise PolicyError(f"cannot load release registry {path}: {exc}") from exc
    if not isinstance(registry, dict):
        raise PolicyError("release registry must be an object")
    if registry.get("schema_version") not in {1, 2}:
        raise PolicyError("release registry schema_version must be 1 or 2")
    if not isinstance(registry.get("delivery_units"), dict):
        raise PolicyError("release registry delivery_units must be an object")
    return registry


def is_sha(value: Any) -> bool:
    return isinstance(value, str) and SHA_RE.fullmatch(value) is not None


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and SHA256_RE.fullmatch(value) is not None


def is_git_ref(value: Any) -> bool:
    if not isinstance(value, str) or not value or any(char in value for char in " ~^:?*[\\"):
        return False
    if value.startswith("/") or value.endswith(("/", ".", ".lock")) or "@{" in value:
        return False
    return all(part not in {"", ".", ".."} for part in value.split("/"))


def is_document_path(path: Any) -> bool:
    if not isinstance(path, str) or not path or path.startswith("/") or "\\" in path:
        return False
    parts = path.split("/")
    return all(part not in {"", ".", ".."} for part in parts) and (
        path == "AGENTS.md" or path.startswith("docs/")
    )


def read_release_contract(text: str, unit: str, version: str, profile: str) -> None:
    values = {}
    for key in METADATA_KEYS:
        values[key] = re.findall(
            rf"(?mi)^[ \t]*{re.escape(key)}[ \t]*:[ \t]*(\S.*?)[ \t]*$",
            text,
        )
    if any(len(items) != 1 for items in values.values()):
        raise PolicyError("evidence must contain exactly one line for each target metadata field")
    expected = {
        "Target-Delivery-Unit": unit,
        "Target-Version": version,
        "Delivery-Profile": profile,
    }
    for key, value in expected.items():
        if values[key][0].strip() != value:
            raise PolicyError(f"evidence {key} mismatch: expected {value!r}")


def validate_evidence_refs(
    refs: Any,
    required_paths: list[str],
    unit: str,
    version: str,
    profile: str,
    ref: str,
    content_fetcher: Callable[[str, str], bytes] | None,
) -> None:
    if not isinstance(refs, list) or not refs:
        raise PolicyError("release-line evidence_refs must be a non-empty array")
    paths: list[str] = []
    for evidence in refs:
        if not isinstance(evidence, dict):
            raise PolicyError("release-line evidence ref must be an object")
        path = evidence.get("path")
        digest = evidence.get("sha256")
        if not is_document_path(path) or not is_sha256(digest):
            raise PolicyError("release-line evidence ref path or sha256 is malformed")
        paths.append(path)
        if content_fetcher is not None:
            content = content_fetcher(ref, path)
            if hashlib.sha256(content).hexdigest() != digest:
                raise PolicyError(f"evidence SHA-256 mismatch for {path} at {ref}")
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise PolicyError(f"evidence is not UTF-8: {path}") from exc
            read_release_contract(text, unit, version, profile)
    if paths != required_paths or len(set(paths)) != len(paths):
        raise PolicyError("release-line evidence paths must exactly match required_evidence_paths")


def validate_release_line_registry(
    config: dict[str, Any],
    registry: dict[str, Any],
    *,
    content_fetcher: Callable[[str, str], bytes] | None = None,
    ancestry_checker: Callable[[str, str], bool] | None = None,
    pr_head_sha: str | None = None,
    planned_evidence_records: set[tuple[str, str]] | None = None,
) -> None:
    config_schema = config.get("schema_version", 1)
    registry_schema = registry.get("schema_version", 1)
    if config_schema != registry_schema:
        raise PolicyError("branch policy and release registry schema versions must match")
    if registry_schema != 2:
        return
    if config.get("schema_version") != 2:
        raise PolicyError("schema version 2 release registry requires schema version 2 branch policy")
    planned_evidence_records = planned_evidence_records or set()

    policies = config["delivery_units"]
    release_units = registry["delivery_units"]
    if set(policies) != set(release_units):
        raise PolicyError("branch policy and release registry delivery units must match exactly")

    for unit, policy in policies.items():
        release_unit = release_units[unit]
        if not isinstance(policy, dict) or not isinstance(release_unit, dict):
            raise PolicyError(f"delivery unit policy is malformed: {unit}")
        if (
            not isinstance(policy.get("profile"), str)
            or not policy["profile"]
            or policy.get("mode") not in {"version-line", "continuous"}
            or not isinstance(policy.get("target_version_source"), str)
            or not isinstance(policy.get("allowed_paths"), list)
            or not policy["allowed_paths"]
            or not all(isinstance(path, str) and path for path in policy["allowed_paths"])
        ):
            raise PolicyError(f"delivery unit policy is incomplete: {unit}")
        active = policy.get("active_versions")
        registry_active = release_unit.get("active_versions")
        if (
            not isinstance(active, list)
            or not all(isinstance(version, str) and re.fullmatch(SEMVER, version) for version in active)
            or len(set(active)) != len(active)
            or not isinstance(registry_active, list)
            or active != registry_active
        ):
            raise PolicyError(f"active version source mismatch for {unit}")
        if policy.get("mode") != "version-line":
            continue

        base_branch = policy.get("version_line_base_branch")
        required_paths = policy.get("required_evidence_paths")
        if not is_git_ref(base_branch):
            raise PolicyError(f"delivery unit {unit} has no version_line_base_branch")
        if (
            not isinstance(required_paths, list)
            or not required_paths
            or not all(is_document_path(path) for path in required_paths)
            or len(set(required_paths)) != len(required_paths)
        ):
            raise PolicyError(f"delivery unit {unit} has invalid required_evidence_paths")

        records = release_unit.get("versions")
        if not isinstance(records, dict):
            raise PolicyError(f"release registry has no version records for {unit}")
        active_records: list[str] = []
        for version, record in records.items():
            if (
                not isinstance(version, str)
                or re.fullmatch(SEMVER, version) is None
                or not isinstance(record, dict)
            ):
                raise PolicyError(f"release-line record is malformed for {unit} {version}")
            status = record.get("status")
            profile = record.get("profile")
            source = record.get("source")
            line = record.get("line")
            if not isinstance(status, str) or status not in {"planned", "active", "closed"}:
                raise PolicyError(f"invalid release-line status for {unit} {version}")
            if profile != policy.get("profile"):
                raise PolicyError(f"release-line profile mismatch for {unit} {version}")
            if (
                not isinstance(source, dict)
                or not is_git_ref(source.get("branch"))
                or not is_sha(source.get("sha"))
            ):
                raise PolicyError(f"release-line source is malformed for {unit} {version}")
            expected_line_branch = f"version/{unit}/{version}"
            if (
                not isinstance(line, dict)
                or line.get("branch") != expected_line_branch
                or not is_sha(line.get("seed_sha"))
            ):
                raise PolicyError(f"release-line seed is malformed for {unit} {version}")
            attested_sha = line.get("attested_sha")
            if status == "planned":
                if attested_sha is not None:
                    raise PolicyError(f"planned release line must not have an attested SHA: {unit} {version}")
            elif not is_sha(attested_sha):
                raise PolicyError(f"{status} release line requires an attested SHA: {unit} {version}")

            evidence_refs = record.get("evidence_refs")
            evidence_ref = attested_sha if status != "planned" else ""
            validate_evidence_refs(
                evidence_refs,
                required_paths,
                unit,
                version,
                profile,
                evidence_ref,
                content_fetcher if evidence_ref else None,
            )

            document_sync = record.get("document_sync")
            if status == "planned":
                if not isinstance(document_sync, dict):
                    raise PolicyError(f"planned release line requires document_sync: {unit} {version}")
            if document_sync is not None:
                if not isinstance(document_sync, dict):
                    raise PolicyError(f"document_sync must be an object for {unit} {version}")
                expected_consumed = status != "planned"
                if (
                    document_sync.get("source_sha") != source["sha"]
                    or document_sync.get("source_sha") != line["seed_sha"]
                    or document_sync.get("target") != expected_line_branch
                    or document_sync.get("consumed") is not expected_consumed
                ):
                    raise PolicyError(f"document_sync contract mismatch for {unit} {version}")
                sync_refs = document_sync.get("evidence_refs")
                if sync_refs != evidence_refs:
                    raise PolicyError(f"document_sync evidence mismatch for {unit} {version}")
            if status == "planned" and (unit, version) in planned_evidence_records:
                if content_fetcher is None or not is_sha(pr_head_sha):
                    raise PolicyError(
                        "changed planned release lines require trusted PR-head evidence"
                    )
                if not isinstance(document_sync, dict):
                    raise PolicyError(
                        f"planned release line requires document_sync: {unit} {version}"
                    )
                validate_evidence_refs(
                    document_sync["evidence_refs"],
                    required_paths,
                    unit,
                    version,
                    profile,
                    pr_head_sha,
                    content_fetcher,
                )

            if status == "active":
                active_records.append(version)
                if ancestry_checker is not None:
                    for ancestor in (source["sha"], line["seed_sha"], attested_sha):
                        if not ancestry_checker(ancestor, expected_line_branch):
                            raise PolicyError(
                                f"version line {expected_line_branch} does not descend from {ancestor}"
                            )
                    if not ancestry_checker(source["sha"], source["branch"]):
                        raise PolicyError(
                            f"source branch {source['branch']} does not descend from {source['sha']}"
                        )
            elif status == "planned" and ancestry_checker is not None:
                if not ancestry_checker(source["sha"], source["branch"]):
                    raise PolicyError(
                        f"source branch {source['branch']} does not descend from {source['sha']}"
                    )

        if active_records != active:
            raise PolicyError(
                f"active_versions for {unit} must exactly match active release-line records"
            )


def validate_planned_document_sync(
    record: dict[str, Any],
    unit: str,
    version: str,
    profile: str,
    base: str,
    base_sha: str | None,
    head_sha: str | None,
    changed_files: list[str],
    content_fetcher: Callable[[str, str], bytes] | None,
    ancestry_checker: Callable[[str, str], bool] | None,
) -> None:
    if record.get("status") != "planned":
        raise PolicyError(f"document sync is only allowed for a planned release line: {unit} {version}")
    sync = record.get("document_sync")
    source = record.get("source")
    line = record.get("line")
    if not isinstance(sync, dict) or not isinstance(source, dict) or not isinstance(line, dict):
        raise PolicyError(f"planned document_sync record is incomplete for {unit} {version}")
    expected_branch = f"version/{unit}/{version}"
    refs = sync.get("evidence_refs")
    paths = [item.get("path") for item in refs if isinstance(item, dict)] if isinstance(refs, list) else []
    if (
        sync.get("consumed") is not False
        or sync.get("target") != expected_branch
        or sync.get("source_sha") != source.get("sha")
        or sync.get("source_sha") != line.get("seed_sha")
        or base != expected_branch
        or base_sha != sync.get("source_sha")
        or not is_sha(head_sha)
        or not paths
        or not all(is_document_path(path) for path in paths)
        or len(set(paths)) != len(paths)
        or set(changed_files) != set(paths)
        or len(changed_files) != len(paths)
    ):
        raise PolicyError(
            "document sync must target the exact planned seed and evidence paths "
            f"for {unit} {version}"
        )
    if content_fetcher is None or ancestry_checker is None:
        raise PolicyError("document sync requires trusted content and ancestry evidence")
    if not ancestry_checker(sync["source_sha"], source["branch"]):
        raise PolicyError(f"source branch {source['branch']} no longer descends from the planned seed")
    if not ancestry_checker(base_sha, head_sha):
        raise PolicyError("document sync head does not descend from its exact base SHA")
    validate_evidence_refs(refs, paths, unit, version, profile, head_sha, content_fetcher)


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
    line_ancestry_checker: Callable[[str, str], bool] | None = None,
    content_fetcher: Callable[[str, str], bytes] | None = None,
    pr_head_sha: str | None = None,
    pr_base_sha: str | None = None,
) -> str:
    validate_release_line_registry(config, release_registry)
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
    registry_unit = release_registry["delivery_units"].get(unit)
    if not isinstance(registry_unit, dict):
        raise PolicyError(f"release registry has no delivery unit {unit}")
    version_record = None
    if release_registry.get("schema_version", 1) == 2 and mode == "version-line":
        records = registry_unit.get("versions")
        version_record = records.get(version) if isinstance(records, dict) else None
        is_planned_sync = (
            branch_type == "sync"
            and isinstance(version_record, dict)
            and version_record.get("status") == "planned"
        )
        if not isinstance(active, list) or (version not in active and not is_planned_sync):
            raise PolicyError(
                f"target version {version} is not active for {unit}; active={active!r}"
            )
    elif not isinstance(active, list) or version not in active:
        raise PolicyError(
            f"target version {version} is not active for {unit}; active={active!r}"
        )
    if mode not in {"version-line", "continuous"}:
        raise PolicyError(f"invalid mode for {unit}: {mode!r}")
    if (
        not isinstance(version_source, str)
        or not version_source.strip()
        or version_source.lower().startswith("pending")
    ):
        raise PolicyError(
            f"delivery unit {unit} has no authoritative target_version_source"
        )
    registry_versions = registry_unit.get("active_versions")
    if registry_versions != active:
        raise PolicyError(
            f"active version source mismatch for {unit}: "
            f"policy={active!r}, registry={registry_versions!r}"
        )

    if version_record is not None:
        if branch_type == "sync":
            validate_planned_document_sync(
                version_record,
                unit,
                version,
                profile,
                base,
                pr_base_sha,
                pr_head_sha,
                changed_files,
                content_fetcher,
                line_ancestry_checker,
            )
        else:
            if version_record.get("status") != "active":
                raise PolicyError(f"release line is not active for product work: {unit} {version}")
            line = version_record.get("line")
            source = version_record.get("source")
            if not isinstance(line, dict) or not isinstance(source, dict):
                raise PolicyError(f"active release-line record is incomplete for {unit} {version}")
            if content_fetcher is not None:
                validate_evidence_refs(
                    version_record.get("evidence_refs"),
                    policy.get("required_evidence_paths", []),
                    unit,
                    version,
                    profile,
                    line.get("attested_sha", ""),
                    content_fetcher,
                )
            if line_ancestry_checker is not None:
                attested_sha = line.get("attested_sha")
                if not is_sha(attested_sha) or not is_sha(pr_head_sha):
                    raise PolicyError("active line validation requires exact PR and attestation SHAs")
                if not line_ancestry_checker(attested_sha, pr_head_sha):
                    raise PolicyError("PR head does not descend from the attested version line")
    allowed_paths = policy.get("allowed_paths")
    if not isinstance(allowed_paths, list) or not allowed_paths:
        raise PolicyError(f"delivery unit {unit} has no allowed_paths policy")
    additional_allowed_paths_by_version = policy.get(
        "additional_allowed_paths_by_version", {}
    )
    if not isinstance(additional_allowed_paths_by_version, dict):
        raise PolicyError(
            f"delivery unit {unit} has invalid additional_allowed_paths_by_version"
        )
    for configured_version, configured_version_additions in additional_allowed_paths_by_version.items():
        if (
            not isinstance(configured_version, str)
            or re.fullmatch(SEMVER, configured_version) is None
        ):
            raise PolicyError(
                f"delivery unit {unit} has invalid additional paths for {configured_version}"
            )
        if (
            not isinstance(configured_version_additions, list)
            or not configured_version_additions
            or not all(
                isinstance(pattern, str) and pattern
                for pattern in configured_version_additions
            )
        ):
            raise PolicyError(
                f"delivery unit {unit} has invalid additional paths for {configured_version}"
            )
    if version not in additional_allowed_paths_by_version:
        version_additions = []
    else:
        configured_version_additions = additional_allowed_paths_by_version[version]
        version_additions = configured_version_additions
    effective_allowed_paths = [*allowed_paths, *version_additions]
    invalid_paths = [
        path
        for path in changed_files
        if path.startswith("/")
        or ".." in Path(path).parts
        or not any(
            fnmatch.fnmatchcase(path, pattern)
            for pattern in effective_allowed_paths
        )
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
        if branch_type not in {"sync", "release", "hotfix"}:
            raise PolicyError(
                f"sync-only paths require a sync or promotion branch for {unit}: "
                + ", ".join(restricted_paths[:5])
            )
        if branch_type == "sync":
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
        promotion_bases = policy.get("promotion_bases", [production])
        if not isinstance(promotion_bases, list) or not all(
            isinstance(candidate, str) and candidate for candidate in promotion_bases
        ):
            raise PolicyError(f"delivery unit {unit} has invalid promotion_bases")
        if base not in promotion_bases:
            raise PolicyError(
                f"{branch_type} base mismatch: observed {base!r}, "
                f"expected one of {promotion_bases!r}"
            )
    elif branch_type == "sync":
        allowed = policy.get("sync_bases", ["dev", f"version/{unit}/{version}"])
        if mode == "version-line" and release_registry.get("schema_version", 1) == 2:
            allowed = [f"version/{unit}/{version}"]
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
    return github_is_ancestor(source_sha, head_sha)


def github_is_ancestor(ancestor_sha: str, descendant_ref: str) -> bool:
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GH_TOKEN", "")
    if (
        re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) is None
        or not is_sha(ancestor_sha)
        or not (is_sha(descendant_ref) or is_git_ref(descendant_ref))
        or not token
    ):
        return False
    encoded_head = urllib.parse.quote(descendant_ref, safe="")
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repository}/compare/{ancestor_sha}...{encoded_head}",
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
    if not isinstance(payload, dict):
        return False
    merge_base = payload.get("merge_base_commit")
    return (
        payload.get("status") in {"ahead", "identical"}
        and isinstance(merge_base, dict)
        and merge_base.get("sha") == ancestor_sha
    )


def github_content_fetcher() -> Callable[[str, str], bytes] | None:
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GH_TOKEN", "")
    if re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) is None or not token:
        return None

    def fetch(ref: str, path: str) -> bytes:
        if not is_document_path(path) or not is_sha(ref):
            raise PolicyError("refusing to fetch unbounded release evidence")
        encoded_path = urllib.parse.quote(path, safe="/")
        encoded_ref = urllib.parse.quote(ref, safe="")
        request = urllib.request.Request(
            f"https://api.github.com/repos/{repository}/contents/{encoded_path}?ref={encoded_ref}",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.load(response)
        except (OSError, ValueError) as exc:
            raise PolicyError(f"cannot fetch release evidence {path} at {ref}") from exc
        if not isinstance(payload, dict):
            raise PolicyError(f"release evidence response is malformed: {path}")
        if payload.get("type") != "file" or payload.get("encoding") != "base64":
            raise PolicyError(f"release evidence is not a regular file: {path}")
        try:
            content = base64.b64decode(payload.get("content", ""), validate=False)
        except (ValueError, TypeError) as exc:
            raise PolicyError(f"release evidence content is malformed: {path}") from exc
        if not content or len(content) > MAX_EVIDENCE_BYTES:
            raise PolicyError(f"release evidence size is invalid: {path}")
        return content

    return fetch


def load_github_json(fetcher: Callable[[str, str], bytes], ref: str, path: str) -> dict[str, Any]:
    try:
        value = json.loads(fetcher(ref, path).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PolicyError(f"prospective policy file is malformed: {path}") from exc
    if not isinstance(value, dict):
        raise PolicyError(f"prospective policy file must contain an object: {path}")
    return value


def registry_source_path(config: dict[str, Any]) -> str:
    sources = {
        unit.get("target_version_source")
        for unit in config["delivery_units"].values()
        if isinstance(unit, dict)
    }
    if len(sources) != 1:
        raise PolicyError("all delivery units must use one release registry")
    source_path = next(iter(sources))
    if (
        not isinstance(source_path, str)
        or not source_path
        or source_path.startswith("/")
        or "\\" in source_path
        or ".." in Path(source_path).parts
    ):
        raise PolicyError("release registry path is missing or unsafe")
    return source_path


def changed_planned_evidence_records(
    base_config: dict[str, Any],
    base_registry: dict[str, Any],
    prospective_config: dict[str, Any],
    prospective_registry: dict[str, Any],
) -> set[tuple[str, str]]:
    base_policies = base_config.get("delivery_units")
    prospective_policies = prospective_config.get("delivery_units")
    base_release_units = base_registry.get("delivery_units")
    prospective_release_units = prospective_registry.get("delivery_units")
    if not all(
        isinstance(value, dict)
        for value in (
            base_policies,
            prospective_policies,
            base_release_units,
            prospective_release_units,
        )
    ):
        return set()

    schema_changed = base_config.get("schema_version") != prospective_config.get(
        "schema_version"
    )
    changed_records: set[tuple[str, str]] = set()
    for unit, prospective_release_unit in prospective_release_units.items():
        if not isinstance(prospective_release_unit, dict):
            continue
        prospective_records = prospective_release_unit.get("versions")
        if not isinstance(prospective_records, dict):
            continue
        base_release_unit = base_release_units.get(unit)
        base_records = (
            base_release_unit.get("versions")
            if isinstance(base_release_unit, dict)
            else {}
        )
        if not isinstance(base_records, dict):
            base_records = {}
        policy_changed = (
            schema_changed
            or base_policies.get(unit) != prospective_policies.get(unit)
        )
        for version, record in prospective_records.items():
            if not isinstance(record, dict) or record.get("status") != "planned":
                continue
            if policy_changed or base_records.get(version) != record:
                changed_records.add((unit, version))
    return changed_records


def validate_prospective_policy_files(
    config: dict[str, Any],
    registry: dict[str, Any],
    changed_files: list[str],
    pr_head_sha: str,
    content_fetcher: Callable[[str, str], bytes] | None,
    ancestry_checker: Callable[[str, str], bool] | None,
) -> None:
    policy_path = ".byungskerlab/branch-policy.json"
    source_path = registry_source_path(config)
    if policy_path not in changed_files and source_path not in changed_files:
        return
    if content_fetcher is None or not is_sha(pr_head_sha):
        raise PolicyError("prospective policy validation requires trusted GitHub content access")
    prospective_config = (
        load_github_json(content_fetcher, pr_head_sha, policy_path)
        if policy_path in changed_files
        else config
    )
    prospective_source = registry_source_path(prospective_config)
    prospective_registry = load_github_json(content_fetcher, pr_head_sha, prospective_source)
    planned_evidence_records = changed_planned_evidence_records(
        config,
        registry,
        prospective_config,
        prospective_registry,
    )
    validate_release_line_registry(
        prospective_config,
        prospective_registry,
        content_fetcher=content_fetcher,
        ancestry_checker=ancestry_checker,
        pr_head_sha=pr_head_sha,
        planned_evidence_records=planned_evidence_records,
    )


def main() -> int:
    try:
        config = load_config(Path(".byungskerlab/branch-policy.json"))
        source_path = registry_source_path(config)
        registry = load_release_registry(Path(source_path))
        changed_files = read_changed_files(os.environ.get("PR_CHANGED_FILES_B64", ""))
        head_sha = os.environ.get("PR_HEAD_SHA", "")
        base_sha = os.environ.get("PR_BASE_SHA", "")
        fetcher = github_content_fetcher()
        if registry.get("schema_version") == 2 and (
            fetcher is None or not is_sha(head_sha) or not is_sha(base_sha)
        ):
            raise PolicyError("schema version 2 validation requires PR SHAs and trusted content access")

        validate_release_line_registry(
            config,
            registry,
            content_fetcher=fetcher,
            ancestry_checker=github_is_ancestor,
            pr_head_sha=head_sha,
        )

        validate_prospective_policy_files(
            config,
            registry,
            changed_files,
            head_sha,
            fetcher,
            github_is_ancestor,
        )

        result = validate(
            config,
            os.environ["PR_HEAD_REF"],
            os.environ["PR_BASE_REF"],
            os.environ.get("PR_BODY", ""),
            changed_files,
            registry,
            github_ancestry_checker,
            github_is_ancestor,
            fetcher,
            head_sha,
            base_sha,
        )
    except (KeyError, PolicyError) as exc:
        print(f"target-version gate failed: {exc}", file=sys.stderr)
        return 1
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
