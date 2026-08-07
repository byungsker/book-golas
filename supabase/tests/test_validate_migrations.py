from pathlib import Path
import tempfile
import unittest

from validate_migrations import violations


class MigrationSafetyTests(unittest.TestCase):
    def assert_findings(self, sql: str, expected: bool) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.sql"
            path.write_text(sql, encoding="utf-8")
            self.assertEqual(bool(violations(path)), expected)

    def test_multiline_delete_without_where_is_blocked(self) -> None:
        self.assert_findings("DELETE\nFROM public.items;", True)

    def test_delete_with_where_is_allowed(self) -> None:
        self.assert_findings("DELETE FROM public.items\nWHERE id = 1;", False)

    def test_safe_delete_marker_allows_explicit_exception(self) -> None:
        self.assert_findings("-- safe-delete\nDELETE FROM public.items;", False)

    def test_drop_table_requires_marker(self) -> None:
        self.assert_findings("DROP\nTABLE public.items;", True)

    def test_string_and_comments_are_ignored(self) -> None:
        self.assert_findings(
            "SELECT 'DELETE FROM fake'; -- DROP TABLE fake\nSELECT 1;",
            False,
        )


if __name__ == "__main__":
    unittest.main()
