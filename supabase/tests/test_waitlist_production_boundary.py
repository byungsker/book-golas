import unittest
from pathlib import Path


MIGRATION = next(
    (Path(__file__).parents[1] / "migrations").glob("*_waitlist_production_boundary.sql")
).read_text(encoding="utf-8")


class WaitlistProductionBoundaryTests(unittest.TestCase):
    def test_direct_client_write_is_revoked(self):
        self.assertIn("revoke all on table public.waitlist from anon, authenticated", MIGRATION)

    def test_cleanup_scheduler_is_idempotent_when_available(self):
        self.assertIn("pg_cron", MIGRATION)
        self.assertIn("bookgolas-waitlist-rate-limit-cleanup", MIGRATION)
        self.assertIn("when unique_violation", MIGRATION)


if __name__ == "__main__":
    unittest.main()
