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
FROM_ENVIRONMENT_PATTERN = re.compile(
    rf"(?:String|bool|int|double){DART_TRIVIA}\.{DART_TRIVIA}fromEnvironment{DART_TRIVIA}\({DART_TRIVIA}['\"]([A-Za-z][A-Za-z0-9_]*)['\"]",
    re.DOTALL,
)
ANY_FROM_ENVIRONMENT_PATTERN = re.compile(
    rf"(?:String|bool|int|double){DART_TRIVIA}\.{DART_TRIVIA}fromEnvironment{DART_TRIVIA}\(",
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
    for source_file in source_root.rglob("*.dart"):
        content = source_file.read_text("utf-8")
        matches = FROM_ENVIRONMENT_PATTERN.findall(content)
        if len(matches) != len(ANY_FROM_ENVIRONMENT_PATTERN.findall(content)):
            raise BoundaryError(
                f"{source_file}: fromEnvironment must use a literal configuration name"
            )
        defines.update(matches)
    disallowed = sorted(defines - ALLOWED_DART_DEFINES)
    if disallowed:
        raise BoundaryError(
            "app source uses non-client compile-time configuration: "
            + ", ".join(disallowed)
        )


def require_client_environment(environment: dict[str, str]) -> None:
    required = (
        "ENVIRONMENT",
        "GOOGLE_SERVER_CLIENT_ID",
        "PAID_SUBSCRIPTIONS_ENABLED",
        "REVENUECAT_PUBLIC_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_URL",
    )
    missing = sorted(name for name in required if not environment.get(name, "").strip())
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
        if any(marker in environment[name] for name in required):
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


def require_upload_order(content: str, label: str) -> None:
    archive_matches = list(re.finditer(r"fastlane (?:beta|release)_build", content))
    upload_matches = list(re.finditer(r"fastlane (?:beta|release)_upload", content))
    scan_matches = list(
        re.finditer(r"--artifact app/ios/build/Runner\.ipa", content)
    )
    if len(archive_matches) != 1 or len(upload_matches) != 1 or len(scan_matches) != 1:
        raise BoundaryError(f"{label}: signed IPA archive, scan, and upload must each occur once")
    if not archive_matches[0].start() < scan_matches[0].start() < upload_matches[0].start():
        raise BoundaryError(f"{label}: signed IPA scan must occur after archive and before upload")


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
            "GOOGLE_SERVER_CLIENT_ID": "public-test-client-id",
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
        source = Path(directory) / "source"
        source.mkdir()
        (source / "allowed.dart").write_text(
            "const value = String /* type */ . /* member */ fromEnvironment /* call */ ( 'ENVIRONMENT' );",
            encoding="utf-8",
        )
        (source / "allowed_line_comment.dart").write_text(
            "const value = String // type\n. // member\nfromEnvironment // call\n( 'ENVIRONMENT' );",
            encoding="utf-8",
        )
        require_allowed_source_defines(source)
        (source / "invalid.dart").write_text(
            "const configName = 'OPENAI_API_KEY'; String // type\n. // member\nfromEnvironment // call\n(configName);",
            encoding="utf-8",
        )
        try:
            require_allowed_source_defines(source)
        except BoundaryError:
            pass
        else:
            raise BoundaryError("self-test did not block an indirect source define")
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
        return
    raise BoundaryError("self-test did not block invalid IPA scan ordering")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path)
    parser.add_argument("--workflow", type=Path, action="append", default=[])
    parser.add_argument("--artifact", type=Path, action="append", default=[])
    parser.add_argument("--forbidden-env", action="append", default=[])
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
        forbidden_values = tuple(
            os.environ[name] for name in args.forbidden_env if os.environ.get(name)
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
