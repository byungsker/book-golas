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
DART_DEFINE_PATTERN = re.compile(r"--dart-define(?:=|\s+)([A-Za-z][A-Za-z0-9_]*)")
FROM_ENVIRONMENT_PATTERN = re.compile(
    r"(?:String|bool|int|double)\.fromEnvironment\(\s*['\"]([A-Za-z][A-Za-z0-9_]*)['\"]"
)


class BoundaryError(ValueError):
    pass


def require_allowed_defines(content: str, label: str) -> None:
    if "--dart-define-from-file" in content:
        raise BoundaryError(f"{label}: --dart-define-from-file is not permitted")
    defines = set(DART_DEFINE_PATTERN.findall(content))
    disallowed = sorted(defines - ALLOWED_DART_DEFINES)
    if disallowed:
        raise BoundaryError(
            f"{label}: non-client Dart defines are not permitted: {', '.join(disallowed)}"
        )


def require_allowed_source_defines(source_root: Path) -> None:
    defines: set[str] = set()
    for source_file in source_root.rglob("*.dart"):
        defines.update(FROM_ENVIRONMENT_PATTERN.findall(source_file.read_text("utf-8")))
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


def require_clean_artifact(artifact: Path) -> None:
    if not artifact.exists():
        raise BoundaryError(f"artifact path does not exist: {artifact}")
    found: set[str] = set()
    for artifact_file in artifact.rglob("*"):
        if not artifact_file.is_file() or artifact_file.is_symlink():
            continue
        with artifact_file.open("rb") as handle:
            carry = b""
            while content := handle.read(65536):
                content = carry + content
                for marker in SERVER_ONLY_MARKERS:
                    if marker.encode("utf-8") in content:
                        found.add(marker)
                carry = content[-64:]
    if found:
        raise BoundaryError(
            "server-only configuration markers found in mobile artifact: "
            + ", ".join(sorted(found))
        )


def run_self_test() -> None:
    require_allowed_defines("--dart-define=ENVIRONMENT=development", "allowed")
    try:
        require_allowed_defines("--dart-define=OPENAI_API_KEY=value", "blocked")
    except BoundaryError:
        pass
    else:
        raise BoundaryError("self-test did not block a server-only Dart define")
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
            return
    raise BoundaryError("self-test did not block a server-only artifact marker")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path)
    parser.add_argument("--workflow", type=Path, action="append", default=[])
    parser.add_argument("--artifact", type=Path, action="append", default=[])
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
            require_allowed_defines(workflow.read_text("utf-8"), str(workflow))
        for artifact in args.artifact:
            require_clean_artifact(artifact)
    except (BoundaryError, OSError) as error:
        print(f"mobile client configuration boundary failed: {error}", file=sys.stderr)
        return 1
    print("mobile client configuration boundary passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
