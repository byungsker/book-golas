import unittest
from pathlib import Path


MIGRATION_DIR = Path(__file__).parents[1] / "migrations"
RECONCILED_VERSIONS = {
    "20260726022112",
    "20260726045759",
    "20260727144950",
    "20260731120950",
}


class MigrationHistoryReconciliationTests(unittest.TestCase):
    def test_incident_versions_have_local_sources(self):
        local_versions = {path.name.split("_", 1)[0] for path in MIGRATION_DIR.glob("*.sql")}
        self.assertTrue(RECONCILED_VERSIONS <= local_versions)


if __name__ == "__main__":
    unittest.main()
