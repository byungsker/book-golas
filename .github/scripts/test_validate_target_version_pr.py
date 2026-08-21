import unittest

from validate_target_version_pr import PolicyError, validate, validate_evidence_refs


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


class DeliveryUnitNameTests(unittest.TestCase):
    def test_accepts_registered_delivery_unit_with_underscore(self):
        config = {
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {
                "agent_api_cli": {
                    "profile": "package-or-local",
                    "mode": "continuous",
                    "active_versions": ["0.1.0"],
                    "target_version_source": ".byungskerlab/release-lines.json",
                    "production_branch": "main",
                    "allowed_paths": ["agent-api/**"],
                },
            },
        }
        registry = {
            "delivery_units": {
                "agent_api_cli": {
                    "active_versions": ["0.1.0"],
                    "evidence_refs": ["docs/product-roadmap.md"],
                    "promotion_sources": {"release": {}, "hotfix": {}},
                },
            },
        }
        result = validate(
            config,
            "codex/feature/agent_api_cli/0.1.0/contract",
            "main",
            "Target-Delivery-Unit: agent_api_cli\n"
            "Target-Version: 0.1.0\n"
            "Delivery-Profile: package-or-local\n",
            ["agent-api/README.md"],
            registry,
        )
        self.assertIn("agent_api_cli", result)


if __name__ == "__main__":
    unittest.main()
