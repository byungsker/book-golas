import unittest

from validate_target_version_pr import validate


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
