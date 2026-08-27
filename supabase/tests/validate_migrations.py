from __future__ import annotations

import re
import sys
from pathlib import Path


TOKEN_PATTERN = re.compile(
    r"(?is)('(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|--[^\n]*|/\*.*?\*/)|;"
)
COMMENT_PATTERN = re.compile(r"(?is)--[^\n]*|/\*.*?\*/")
OPERATION_PATTERN = re.compile(
    r"(?is)\b(drop\s+(?:table|column)|truncate(?:\s+table)?|delete\s+from)\b"
)


def sanitize_sql(source: str) -> str:
    pieces: list[str] = []
    cursor = 0
    for match in TOKEN_PATTERN.finditer(source):
        pieces.append(source[cursor:match.start()])
        if match.group(0) == ";":
            pieces.append(";")
        else:
            pieces.append(" " * len(match.group(0)))
        cursor = match.end()
    pieces.append(source[cursor:])
    return "".join(pieces)


def is_safe(source: str, start: int, end: int) -> bool:
    statement = source[start:end]
    return any(
        "safe-delete" in match.group(0).lower()
        for match in COMMENT_PATTERN.finditer(statement)
    )


def violations(path: Path) -> list[str]:
    source = path.read_text(encoding="utf-8")
    sanitized = sanitize_sql(source)
    findings: list[str] = []
    for match in OPERATION_PATTERN.finditer(sanitized):
        operation = re.sub(r"\s+", " ", match.group(1).lower())
        statement_start = sanitized.rfind(";", 0, match.start()) + 1
        statement_end = sanitized.find(";", match.end())
        if statement_end == -1:
            statement_end = len(sanitized)
        statement = sanitized[match.end() : statement_end]
        safe = is_safe(source, statement_start, statement_end)
        if operation.startswith("delete"):
            if not re.search(r"\bwhere\b", statement, re.IGNORECASE) and not safe:
                findings.append(f"{path}: DELETE without WHERE at {match.start()}")
        elif not safe:
            findings.append(f"{path}: {operation.upper()} requires -- safe-delete")
    return findings


def main(argv: list[str]) -> int:
    paths = [Path(value) for value in argv[1:]]
    findings = [finding for path in paths for finding in violations(path)]
    for finding in findings:
        print(f"::error::{finding}")
    if findings:
        return 1
    print(f"Migration safety validation passed for {len(paths)} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
