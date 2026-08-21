import unittest

from validate_target_version_pr import PolicyError, validate_evidence_refs


class EvidenceReferenceTests(unittest.TestCase):
    def test_accepts_active_versions_attested_by_evidence(self):
        validate_evidence_refs(
            {"evidence_refs": ["AGENTS.md", "docs/product-roadmap.md"]},
            ["1.0.2", "1.1.0"],
            lambda ref: {
                "AGENTS.md": "approved 1.0.2",
                "docs/product-roadmap.md": "approved 1.1.0",
            }[ref],
        )

    def test_rejects_missing_evidence_refs(self):
        with self.assertRaisesRegex(PolicyError, "non-empty string array"):
            validate_evidence_refs({}, ["1.0.2"])

    def test_rejects_unattested_active_version(self):
        with self.assertRaisesRegex(PolicyError, "absent from release registry"):
            validate_evidence_refs(
                {"evidence_refs": ["AGENTS.md"]},
                ["1.0.2"],
                lambda ref: "approved 1.1.0",
            )

    def test_rejects_unsafe_evidence_path(self):
        with self.assertRaisesRegex(PolicyError, "unsafe"):
            validate_evidence_refs(
                {"evidence_refs": ["../AGENTS.md"]},
                ["1.0.2"],
            )


if __name__ == "__main__":
    unittest.main()
