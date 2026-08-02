#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import binascii
import json
import os
import re
import sys
import tempfile
import zipfile
from pathlib import Path


ALLOWED_DART_DEFINES = frozenset(
    {
        "ADMOB_BANNER_ANDROID",
        "ADMOB_BANNER_IOS",
        "ADMOB_NATIVE_ANDROID",
        "ADMOB_NATIVE_IOS",
        "ENVIRONMENT",
        "GOOGLE_BOOKS_API_KEY",
        "GOOGLE_SERVER_CLIENT_ID",
        "PAID_SUBSCRIPTIONS_ENABLED",
        "REVENUECAT_PUBLIC_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_URL",
    }
)
REQUIRED_CLIENT_ENVIRONMENT = (
    "ENVIRONMENT",
    "PAID_SUBSCRIPTIONS_ENABLED",
    "REVENUECAT_PUBLIC_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_URL",
)
OPTIONAL_CLIENT_ENVIRONMENT = (
    "GOOGLE_SERVER_CLIENT_ID",
)
FORBIDDEN_ENVIRONMENT_CONTRACTS = {
    "ios-testflight.yml": (
        {
            "CERTIFICATE_P12_BASE64",
            "CERTIFICATE_PASSWORD",
        },
        {
            "ALADIN_TTB_KEY",
            "FIREBASE_SERVICE_ACCOUNT",
            "GOOGLE_CLOUD_VISION_API_KEY",
            "OPENAI_API_KEY",
            "RESEND_API_KEY",
            "REVENUECAT_WEBHOOK_AUTH_KEY_DEV",
            "SUPABASE_SERVICE_ROLE_KEY",
        },
    ),
    "ios-production.yml": (
        {
            "APP_STORE_CONNECT_API_KEY_CONTENT",
            "CERTIFICATE_P12_BASE64",
            "CERTIFICATE_PASSWORD",
        },
        {
            "ALADIN_TTB_KEY",
            "FIREBASE_SERVICE_ACCOUNT",
            "GOOGLE_CLOUD_VISION_API_KEY",
            "OPENAI_API_KEY",
            "RESEND_API_KEY",
            "REVENUECAT_WEBHOOK_AUTH_KEY_PROD",
            "SUPABASE_SERVICE_ROLE_KEY",
        },
    ),
}
SIGNED_IPA_WORKFLOW_STEPS = {
    "ios-testflight.yml": (
        "Build signed TestFlight IPA",
        "Verify signed TestFlight IPA boundary",
        "Upload scanned TestFlight IPA",
        "fastlane beta_build",
        "fastlane beta_upload",
    ),
    "ios-production.yml": (
        "Build signed App Store IPA",
        "Verify signed App Store IPA boundary",
        "Upload scanned App Store IPA",
        "fastlane release_build",
        "fastlane release_upload",
    ),
}
SERVER_ONLY_MARKERS = (
    "ALADIN_TTB_KEY",
    "APP_STORE_CONNECT_API_KEY",
    "CERTIFICATE_PASSWORD",
    "CERTIFICATE_P12",
    "FIREBASE_SERVICE_ACCOUNT",
    "GOOGLE_CLOUD_VISION_API_KEY",
    "OPENAI_API_KEY",
    "PRIVATE_KEY",
    "PROVISIONING_PROFILE",
    "REVENUECAT_WEBHOOK",
    "RESEND_API_KEY",
    "SERVICE_ROLE",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_PROJECT_REF",
)
DART_DEFINE_PATTERN = re.compile(
    r"--dart-define(?:=|\s+)([A-Za-z][A-Za-z0-9_]*)="
)
ANY_DART_DEFINE_PATTERN = re.compile(r"--dart-define(?![-A-Za-z])")
DART_TRIVIA = r"(?:\s+|/\*.*?\*/|//[^\r\n]*(?:\r?\n|$))*"
FROM_ENVIRONMENT_CALL = (
    rf"(?:String|bool|int|double){DART_TRIVIA}\."
    rf"{DART_TRIVIA}fromEnvironment{DART_TRIVIA}\({DART_TRIVIA}"
)
FROM_ENVIRONMENT_PATTERN = re.compile(
    rf"{FROM_ENVIRONMENT_CALL}(?P<quote>['\"])(?P<name>[A-Za-z][A-Za-z0-9_]*)(?P=quote){DART_TRIVIA}(?:,|\))",
    re.DOTALL,
)
ANY_FROM_ENVIRONMENT_PATTERN = re.compile(
    FROM_ENVIRONMENT_CALL,
    re.DOTALL,
)


class BoundaryError(ValueError):
    pass


def require_allowed_defines(content: str, label: str) -> None:
    if "--dart-define-from-file" in content:
        raise BoundaryError(f"{label}: --dart-define-from-file is not permitted")
    matches = DART_DEFINE_PATTERN.findall(content)
    if len(matches) != len(ANY_DART_DEFINE_PATTERN.findall(content)):
        raise BoundaryError(f"{label}: Dart define syntax must use a literal name")
    defines = set(matches)
    disallowed = sorted(defines - ALLOWED_DART_DEFINES)
    if disallowed:
        raise BoundaryError(
            f"{label}: non-client Dart defines are not permitted: {', '.join(disallowed)}"
        )


def require_allowed_source_defines(source_root: Path) -> None:
    defines: set[str] = set()
    source_directory = source_root / "lib"
    if not source_directory.is_dir():
        raise BoundaryError(f"Flutter source directory does not exist: {source_directory}")
    for source_file in source_directory.rglob("*.dart"):
        content = source_file.read_text("utf-8")
        matches = list(FROM_ENVIRONMENT_PATTERN.finditer(content))
        if len(matches) != len(ANY_FROM_ENVIRONMENT_PATTERN.findall(content)):
            raise BoundaryError(
                f"{source_file}: fromEnvironment must use exactly one literal configuration name"
            )
        defines.update(match.group("name") for match in matches)
    disallowed = sorted(defines - ALLOWED_DART_DEFINES)
    if disallowed:
        raise BoundaryError(
            "app source uses non-client compile-time configuration: "
            + ", ".join(disallowed)
        )


def require_client_environment(environment: dict[str, str]) -> None:
    missing = sorted(
        name
        for name in REQUIRED_CLIENT_ENVIRONMENT
        if not environment.get(name, "").strip()
    )
    if missing:
        raise BoundaryError(
            "required client configuration is missing: " + ", ".join(missing)
        )
    if environment["ENVIRONMENT"] not in {"development", "production"}:
        raise BoundaryError("ENVIRONMENT must be development or production")
    if environment["PAID_SUBSCRIPTIONS_ENABLED"] not in {"false", "true"}:
        raise BoundaryError("PAID_SUBSCRIPTIONS_ENABLED must be false or true")
    if not re.fullmatch(
        r"https://[A-Za-z0-9-]+\.supabase\.co", environment["SUPABASE_URL"]
    ):
        raise BoundaryError("SUPABASE_URL must be a public Supabase HTTPS URL")
    for marker in SERVER_ONLY_MARKERS:
        if any(
            marker in environment.get(name, "")
            for name in REQUIRED_CLIENT_ENVIRONMENT + OPTIONAL_CLIENT_ENVIRONMENT
        ):
            raise BoundaryError("client configuration contains a server-only marker")
    parts = environment["SUPABASE_ANON_KEY"].split(".")
    if len(parts) == 3:
        try:
            payload = parts[1] + "=" * (-len(parts[1]) % 4)
            role = json.loads(base64.urlsafe_b64decode(payload)).get("role")
        except (binascii.Error, ValueError, json.JSONDecodeError, UnicodeDecodeError):
            raise BoundaryError("SUPABASE_ANON_KEY has an invalid JWT payload") from None
        if role != "anon":
            raise BoundaryError("SUPABASE_ANON_KEY must have the anon role")


def encoded_forms(value: str) -> tuple[bytes, ...]:
    raw = value.encode("utf-8")
    base64_value = base64.b64encode(raw)
    urlsafe_base64_value = base64.urlsafe_b64encode(raw)
    return (
        raw,
        base64_value,
        base64_value.rstrip(b"="),
        urlsafe_base64_value,
        urlsafe_base64_value.rstrip(b"="),
        raw.hex().encode("ascii"),
    )


def scan_stream(handle: object, needles: tuple[bytes, ...]) -> bool:
    if not needles:
        return False
    carry_size = max(len(needle) for needle in needles) - 1
    carry = b""
    while content := handle.read(65536):
        content = carry + content
        if any(needle in content for needle in needles):
            return True
        carry = content[-carry_size:] if carry_size else b""
    return False


def artifact_files(artifact: Path) -> tuple[Path, ...]:
    if artifact.is_file():
        return (artifact,)
    return tuple(
        item for item in artifact.rglob("*") if item.is_file() and not item.is_symlink()
    )


def file_contains_forbidden_material(file_path: Path, needles: tuple[bytes, ...]) -> bool:
    if zipfile.is_zipfile(file_path):
        with zipfile.ZipFile(file_path) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue
                with archive.open(member) as handle:
                    if scan_stream(handle, needles):
                        return True
        return False
    with file_path.open("rb") as handle:
        return scan_stream(handle, needles)


def require_clean_artifact(artifact: Path, forbidden_values: tuple[str, ...] = ()) -> None:
    if not artifact.exists():
        raise BoundaryError(f"artifact path does not exist: {artifact}")
    marker_needles = tuple(marker.encode("utf-8") for marker in SERVER_ONLY_MARKERS)
    value_needles = tuple(
        form for value in forbidden_values if value for form in encoded_forms(value)
    )
    for artifact_file in artifact_files(artifact):
        if file_contains_forbidden_material(artifact_file, marker_needles):
            raise BoundaryError("server-only configuration marker found in mobile artifact")
        if value_needles and file_contains_forbidden_material(artifact_file, value_needles):
            raise BoundaryError("forbidden value-derived material found in mobile artifact")


def require_required_forbidden_environment_values(
    environment: dict[str, str], names: tuple[str, ...]
) -> tuple[str, ...]:
    missing = sorted(name for name in names if not environment.get(name, "").strip())
    if missing:
        raise BoundaryError(
            "forbidden value scan requested for unset variables: " + ", ".join(missing)
        )
    return tuple(environment[name] for name in names)


def optional_forbidden_environment_values(
    environment: dict[str, str], names: tuple[str, ...]
) -> tuple[str, ...]:
    return tuple(
        environment[name] for name in names if environment.get(name, "").strip()
    )


def forbidden_environment_values(
    environment: dict[str, str], required_names: tuple[str, ...], optional_names: tuple[str, ...]
) -> tuple[str, ...]:
    overlapping_names = sorted(set(required_names) & set(optional_names))
    if overlapping_names:
        raise BoundaryError(
            "forbidden environment inputs cannot be both required and optional: "
            + ", ".join(overlapping_names)
        )
    return require_required_forbidden_environment_values(
        environment, required_names
    ) + optional_forbidden_environment_values(environment, optional_names)


def workflow_step_run_block(content: str, label: str, step_name: str) -> tuple[str, ...]:
    lines = content.splitlines()
    step_pattern = re.compile(r"^(?P<indent>\s*)-\s+name:\s*(?P<name>.+?)\s*$")
    matches = []
    for index, line in enumerate(lines):
        match = step_pattern.fullmatch(line)
        if match and match.group("name").strip(" '\"") == step_name:
            matches.append((index, len(match.group("indent"))))
    if len(matches) != 1:
        raise BoundaryError(f"{label}: signed IPA step {step_name!r} must occur once")

    start, step_indent = matches[0]
    end = len(lines)
    for index in range(start + 1, len(lines)):
        match = step_pattern.fullmatch(lines[index])
        if match and len(match.group("indent")) <= step_indent:
            end = index
            break

    run_pattern = re.compile(r"^(?P<indent>\s*)run:\s*\|\s*$")
    run_matches = [
        (index, len(match.group("indent")))
        for index in range(start + 1, end)
        if (match := run_pattern.fullmatch(lines[index]))
    ]
    if len(run_matches) != 1:
        raise BoundaryError(f"{label}: signed IPA step {step_name!r} must have one run block")

    run_start, run_indent = run_matches[0]
    run_lines = []
    for line in lines[run_start + 1 : end]:
        if line.strip() and len(line) - len(line.lstrip()) <= run_indent:
            break
        run_lines.append(line)
    if not run_lines:
        raise BoundaryError(f"{label}: signed IPA step {step_name!r} run block is empty")
    return tuple(run_lines)


def shell_commands(run_lines: tuple[str, ...], label: str) -> tuple[str, ...]:
    commands = []
    current = []
    for line in run_lines:
        stripped = line.strip()
        code = line.split("#", 1)[0].strip()
        if not code:
            if current and current[-1].endswith("\\") and stripped.startswith("#"):
                raise BoundaryError(f"{label}: shell comments cannot interrupt a continuation")
            continue
        current.append(code)
        if code.endswith("\\"):
            continue
        commands.append(" ".join(current))
        current = []
    if current:
        if current[-1].endswith("\\"):
            raise BoundaryError(f"{label}: shell continuation is incomplete")
        commands.append(" ".join(current))
    return tuple(commands)


def signed_ipa_scan_command(content: str, label: str) -> str:
    workflow = SIGNED_IPA_WORKFLOW_STEPS.get(Path(label).name)
    if workflow is None:
        raise BoundaryError(f"{label}: signed IPA workflow contract is unknown")
    _, scan_step, _, _, _ = workflow
    commands = shell_commands(workflow_step_run_block(content, label, scan_step), label)
    matches = [
        command
        for command in commands
        if re.search(r"\bpython3\s+app/tool/verify_mobile_client_config\.py\b", command)
    ]
    if len(matches) != 1:
        raise BoundaryError(f"{label}: signed IPA boundary must invoke the scanner once")
    command = matches[0]
    if "--artifact app/ios/build/Runner.ipa" not in command:
        raise BoundaryError(f"{label}: signed IPA boundary must scan Runner.ipa")
    return command


def require_upload_order(content: str, label: str) -> None:
    workflow = SIGNED_IPA_WORKFLOW_STEPS.get(Path(label).name)
    if workflow is not None:
        build_step, _, upload_step, build_command, upload_command = workflow
        build_commands = shell_commands(
            workflow_step_run_block(content, label, build_step), label
        )
        upload_commands = shell_commands(
            workflow_step_run_block(content, label, upload_step), label
        )
        if sum(build_command in command for command in build_commands) != 1:
            raise BoundaryError(f"{label}: signed IPA archive command must occur once")
        signed_ipa_scan_command(content, label)
        if sum(upload_command in command for command in upload_commands) != 1:
            raise BoundaryError(f"{label}: signed IPA upload command must occur once")
        require_forbidden_environment_contract(content, label)
        return
    archive_matches = list(re.finditer(r"fastlane (?:beta|release)_build", content))
    upload_matches = list(re.finditer(r"fastlane (?:beta|release)_upload", content))
    scan_matches = list(
        re.finditer(r"--artifact app/ios/build/Runner\.ipa", content)
    )
    if len(archive_matches) != 1 or len(upload_matches) != 1 or len(scan_matches) != 1:
        raise BoundaryError(f"{label}: signed IPA archive, scan, and upload must each occur once")
    if not archive_matches[0].start() < scan_matches[0].start() < upload_matches[0].start():
        raise BoundaryError(f"{label}: signed IPA scan must occur after archive and before upload")


def require_forbidden_environment_contract(content: str, label: str) -> None:
    expected = FORBIDDEN_ENVIRONMENT_CONTRACTS.get(Path(label).name)
    if expected is None:
        return
    command = signed_ipa_scan_command(content, label)
    if "--forbidden-env" in command:
        raise BoundaryError(f"{label}: forbidden environment inputs must be classified")
    required_names = re.findall(
        r"--required-forbidden-env\s+([A-Za-z][A-Za-z0-9_]*)", command
    )
    optional_names = re.findall(
        r"--optional-forbidden-env\s+([A-Za-z][A-Za-z0-9_]*)", command
    )
    if len(required_names) != len(set(required_names)) or len(optional_names) != len(
        set(optional_names)
    ):
        raise BoundaryError(f"{label}: forbidden environment inputs must not repeat")
    if set(required_names) & set(optional_names):
        raise BoundaryError(f"{label}: forbidden environment inputs cannot overlap")
    expected_required, expected_optional = expected
    if set(required_names) != expected_required or set(optional_names) != expected_optional:
        raise BoundaryError(f"{label}: forbidden environment input contract does not match")


def run_self_test() -> None:
    require_allowed_defines("--dart-define=ENVIRONMENT=development", "allowed")
    try:
        require_allowed_defines("--dart-define=OPENAI_API_KEY=value", "blocked")
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block a server-only Dart define")
    try:
        require_allowed_defines("--dart-define=${CONFIG_NAME}=value", "blocked")
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block an indirect Dart define")
    try:
        require_allowed_defines("--dart-define-from-file=local.env", "blocked")
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block a Dart define file")
    require_client_environment(
        {
            "ENVIRONMENT": "development",
            "GOOGLE_SERVER_CLIENT_ID": "",
            "PAID_SUBSCRIPTIONS_ENABLED": "false",
            "REVENUECAT_PUBLIC_KEY": "public-test-key",
            "SUPABASE_ANON_KEY": "public-test-key",
            "SUPABASE_URL": "https://example.supabase.co",
        }
    )
    try:
        require_client_environment(
            {
                "ENVIRONMENT": "development",
                "PAID_SUBSCRIPTIONS_ENABLED": "false",
                "REVENUECAT_PUBLIC_KEY": "public-test-key",
                "SUPABASE_ANON_KEY": "public-test-key",
                "SUPABASE_URL": "",
            }
        )
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block an empty required client value")
    try:
        require_client_environment(
            {
                "ENVIRONMENT": "development",
                "GOOGLE_SERVER_CLIENT_ID": "public-test-client-id",
                "PAID_SUBSCRIPTIONS_ENABLED": "false",
                "REVENUECAT_PUBLIC_KEY": "public-test-key",
                "SUPABASE_ANON_KEY": "public-test-key",
                "SUPABASE_URL": "http://example.supabase.co",
            }
        )
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block an invalid client URL")
    require_required_forbidden_environment_values(
        {"SCAN_VALUE": "present"}, ("SCAN_VALUE",)
    )
    for environment, names, message in (
        (
            {"SCAN_VALUE": "present"},
            ("MISSING",),
            "self-test did not block an unset forbidden scan value",
        ),
        (
            {"EMPTY": " "},
            ("EMPTY",),
            "self-test did not block an empty forbidden scan value",
        ),
    ):
        try:
            require_required_forbidden_environment_values(environment, names)
        except BoundaryError:
            pass
        else:
            raise BoundaryError(message)
    if optional_forbidden_environment_values({}, ("OPTIONAL",)):
        raise BoundaryError("self-test did not skip an unset optional forbidden value")
    if optional_forbidden_environment_values({"OPTIONAL": " "}, ("OPTIONAL",)):
        raise BoundaryError("self-test did not skip a blank optional forbidden value")
    optional_value = "optional-server-only-test-value"
    if optional_forbidden_environment_values(
        {"OPTIONAL": optional_value}, ("OPTIONAL",)
    ) != (optional_value,):
        raise BoundaryError("self-test did not collect a configured optional forbidden value")
    try:
        forbidden_environment_values(
            {"DUPLICATE": "present"}, ("DUPLICATE",), ("DUPLICATE",)
        )
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not reject duplicate forbidden input classes")
    with tempfile.TemporaryDirectory() as directory:
        artifact = Path(directory) / "app"
        artifact.mkdir()
        (artifact / "binary").write_bytes(b"safe")
        require_clean_artifact(artifact)
        (artifact / "binary").write_bytes(
            b"x" * 65530 + b"SUPABASE_SERVICE_ROLE_KEY"
        )
        try:
            require_clean_artifact(artifact)
        except BoundaryError:
            pass
        else:
            raise BoundaryError("self-test did not block a server-only artifact marker")
        forbidden_value = "server-only-test-value"
        (artifact / "binary").write_bytes(forbidden_value.encode("utf-8"))
        try:
            require_clean_artifact(artifact, (forbidden_value,))
        except BoundaryError:
            pass
        else:
            raise BoundaryError("self-test did not scan a raw forbidden value")
        cross_chunk_value = "z" * 2048
        (artifact / "binary").write_bytes(
            b"x" * (65536 - 1024) + cross_chunk_value.encode("utf-8")
        )
        try:
            require_clean_artifact(artifact, (cross_chunk_value,))
        except BoundaryError:
            pass
        else:
            raise BoundaryError("self-test did not scan a cross-chunk forbidden value")
        (artifact / "binary").write_bytes(b"safe")
        with zipfile.ZipFile(artifact / "Runner.ipa", "w") as archive:
            archive.writestr("Payload/Runner.app/config", base64.b64encode(forbidden_value.encode("utf-8")))
        try:
            require_clean_artifact(artifact / "Runner.ipa", (forbidden_value,))
        except BoundaryError:
            pass
        else:
            raise BoundaryError("self-test did not scan compressed IPA content")
        (artifact / "binary").write_bytes(optional_value.encode("utf-8"))
        try:
            require_clean_artifact(
                artifact,
                optional_forbidden_environment_values(
                    {"OPTIONAL": optional_value}, ("OPTIONAL",)
                ),
            )
        except BoundaryError:
            pass
        else:
            raise BoundaryError("self-test did not scan a configured optional forbidden value")
        source = Path(directory) / "source"
        source_directory = source / "lib"
        source_directory.mkdir(parents=True)
        (source_directory / "allowed.dart").write_text(
            "const value = String /* type */ . /* member */ fromEnvironment /* call */ ( 'ENVIRONMENT' );",
            encoding="utf-8",
        )
        (source_directory / "allowed_line_comment.dart").write_text(
            "const value = String // type\n. // member\nfromEnvironment // call\n( 'ENVIRONMENT' );",
            encoding="utf-8",
        )
        ignored_directory = source / "tool"
        ignored_directory.mkdir()
        (ignored_directory / "ignored.dart").write_text(
            "const configName = 'OPENAI_API_KEY'; String.fromEnvironment(configName);",
            encoding="utf-8",
        )
        require_allowed_source_defines(source)
        for filename, content, message in (
            (
                "indirect.dart",
                "const configName = 'OPENAI_API_KEY'; String // type\n. // member\nfromEnvironment // call\n(configName);",
                "self-test did not block an indirect source define",
            ),
            (
                "adjacent.dart",
                "const value = String.fromEnvironment('SUPABASE_URL' '_OVERRIDE');",
                "self-test did not block adjacent source literals",
            ),
            (
                "adjacent_trivia.dart",
                "const value = String /* type */ . /* member */ fromEnvironment /* call */ ( 'SUPABASE_URL' /* adjacent */ '_OVERRIDE' );",
                "self-test did not block comment-separated adjacent source literals",
            ),
        ):
            invalid_source = source_directory / filename
            invalid_source.write_text(content, encoding="utf-8")
            try:
                require_allowed_source_defines(source)
            except BoundaryError:
                invalid_source.unlink()
            else:
                raise BoundaryError(message)
    require_upload_order(
        "fastlane beta_build --artifact app/ios/build/Runner.ipa fastlane beta_upload",
        "allowed",
    )
    try:
        require_upload_order(
            "fastlane beta_build fastlane beta_upload --artifact app/ios/build/Runner.ipa",
            "blocked",
        )
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block invalid IPA scan ordering")
    for workflow_name, contract in FORBIDDEN_ENVIRONMENT_CONTRACTS.items():
        build_step, scan_step, upload_step, build_command, upload_command = (
            SIGNED_IPA_WORKFLOW_STEPS[workflow_name]
        )
        required_names, optional_names = contract
        flags = " ".join(
            [
                "--required-forbidden-env " + name
                for name in sorted(required_names)
            ]
            + [
                "--optional-forbidden-env " + name
                for name in sorted(optional_names)
            ]
        )
        scan_command = (
            "python3 app/tool/verify_mobile_client_config.py "
            "--artifact app/ios/build/Runner.ipa "
            + flags
        )
        workflow = "\n".join(
            (
                "jobs:",
                "  build:",
                "    steps:",
                f"      - name: {build_step}",
                "        run: |",
                f"          {build_command}",
                f"      - name: {scan_step}",
                "        run: |",
                f"          {scan_command}",
                f"      - name: {upload_step}",
                "        run: |",
                f"          {upload_command}",
            )
        )
        require_upload_order(workflow, workflow_name)
        for bypass in (
            workflow.replace(
                scan_command,
                scan_command.split(" --required", 1)[0] + "\n          # " + flags,
            ),
            workflow.replace(
                f"      - name: {upload_step}",
                "\n".join(
                    (
                        "      - name: Unrelated scanner-looking step",
                        "        run: |",
                        f"          {scan_command}",
                        f"      - name: {upload_step}",
                    )
                ),
            ).replace(scan_command, scan_command.split(" --required", 1)[0], 1),
        ):
            try:
                require_upload_order(bypass, workflow_name)
            except BoundaryError:
                pass
            else:
                raise BoundaryError(
                    "self-test did not block a signed IPA workflow classification bypass"
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path)
    parser.add_argument("--workflow", type=Path, action="append", default=[])
    parser.add_argument("--artifact", type=Path, action="append", default=[])
    parser.add_argument("--required-forbidden-env", action="append", default=[])
    parser.add_argument("--optional-forbidden-env", action="append", default=[])
    parser.add_argument("--require-client-environment", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.self_test:
            run_self_test()
        if args.source_root:
            require_allowed_source_defines(args.source_root)
        if args.require_client_environment:
            require_client_environment(dict(os.environ))
        for workflow in args.workflow:
            content = workflow.read_text("utf-8")
            require_allowed_defines(content, str(workflow))
            require_upload_order(content, str(workflow))
            require_forbidden_environment_contract(content, str(workflow))
        forbidden_values = forbidden_environment_values(
            dict(os.environ),
            tuple(args.required_forbidden_env),
            tuple(args.optional_forbidden_env),
        )
        for artifact in args.artifact:
            require_clean_artifact(artifact, forbidden_values)
    except (BoundaryError, OSError) as error:
        print(f"mobile client configuration boundary failed: {error}", file=sys.stderr)
        return 1
    print("mobile client configuration boundary passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
