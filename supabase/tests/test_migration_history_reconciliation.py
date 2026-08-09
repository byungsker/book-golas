import unittest
import hashlib
from pathlib import Path


MIGRATION_DIR = Path(__file__).parents[1] / "migrations"
RECONCILED_VERSIONS = {
    "20260726022112",
    "20260726045759",
    "20260727144950",
    "20260731120950",
}
PROVENANCE = {
    "20260726022112_privatize_book_images.sql": ("15aa7438e9d32cf705df8976598493b9638d371e", "3e1e500bd36546bd800fd5fb55548358e4673bb4c0b24ce780445b77cb10165a"),
    "20260726045759_personalize_and_dedupe_reading_reminders.sql": ("9e213fd7f5711295efa00103ff0dab555770fdaa", "b84b0ab5577b6a5aa88a5d27ac8be0c5a9c0ff66927f9b381034a4ff8402fb64"),
    "20260727144950_secure_legacy_book_image_ownership.sql": ("c033e8ba58b97d1fea5edb50dace20853ff7a363", "44c5e50f19daeecb0a09683fb6857d415492b8909fb624678b6a615c8e87c2b7"),
    "20260731120950_create_third_party_ai_consents.sql": ("685763496aa8585ebce54043bbcbdc6cd627a253", "59ad1eec58490b2215cc5a99752df5608d7e69ac94e15519655611efe7143ecf"),
}


class MigrationHistoryReconciliationTests(unittest.TestCase):
    def test_incident_versions_have_local_sources(self):
        local_versions = {path.name.split("_", 1)[0] for path in MIGRATION_DIR.glob("*.sql")}
        self.assertTrue(RECONCILED_VERSIONS <= local_versions)

    def test_restored_sources_match_immutable_provenance(self):
        for name, (_, expected_hash) in PROVENANCE.items():
            self.assertEqual(hashlib.sha256((MIGRATION_DIR / name).read_bytes()).hexdigest(), expected_hash)


if __name__ == "__main__":
    unittest.main()
