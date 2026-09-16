import unittest

from validate_target_version_pr import PolicyError, validate


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

    def test_rejects_explicit_empty_version_path_override(self):
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
                    "additional_allowed_paths_by_version": {"0.1.0": []},
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
        with self.assertRaisesRegex(
            PolicyError, "invalid additional paths for 0.1.0"
        ):
            validate(
                config,
                "codex/feature/agent_api_cli/0.1.0/contract",
                "main",
                "Target-Delivery-Unit: agent_api_cli\n"
                "Target-Version: 0.1.0\n"
                "Delivery-Profile: package-or-local\n",
                ["supabase/migrations/20260910000000_progress.sql"],
                registry,
            )

    def test_rejects_explicit_null_version_path_override(self):
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
                    "additional_allowed_paths_by_version": {"0.1.0": None},
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
        with self.assertRaisesRegex(
            PolicyError, "invalid additional paths for 0.1.0"
        ):
            validate(
                config,
                "codex/feature/agent_api_cli/0.1.0/contract",
                "main",
                "Target-Delivery-Unit: agent_api_cli\n"
                "Target-Version: 0.1.0\n"
                "Delivery-Profile: package-or-local\n",
                ["agent-api/README.md"],
                registry,
            )

    def test_accepts_promotion_delivery_unit_with_underscore(self):
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
                    "promotion_sources": {
                        "release": {
                            "0.1.0": {
                                "branch": "main",
                                "sha": "0" * 40,
                            },
                        },
                    },
                },
            },
        }
        result = validate(
            config,
            "codex/release/agent_api_cli/0.1.0",
            "main",
            "Target-Delivery-Unit: agent_api_cli\n"
            "Target-Version: 0.1.0\n"
            "Delivery-Profile: package-or-local\n"
            "Promotion-Source-SHA: " + "0" * 40 + "\n",
            ["agent-api/README.md"],
            registry,
            ancestry_checker=lambda _sha: True,
        )
        self.assertIn("agent_api_cli", result)


class WebVersionPathTests(unittest.TestCase):
    def setUp(self):
        self.config = {
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {
                "web": {
                    "profile": "web-release-train",
                    "mode": "version-line",
                    "active_versions": ["1.0.2", "1.1.0"],
                    "target_version_source": ".byungskerlab/release-lines.json",
                    "production_branch": "main",
                    "allowed_paths": ["web/**"],
                    "additional_allowed_paths_by_version": {
                        "1.1.0": [
                            ".omo/evidence/bookgolas-web-app-parity/**",
                            "supabase/migrations/**",
                            "supabase/functions/**",
                        ],
                    },
                },
            },
        }
        self.registry = {
            "delivery_units": {
                "web": {
                    "active_versions": ["1.0.2", "1.1.0"],
                },
            },
        }

    def test_accepts_web_1_1_version_paths(self):
        result = validate(
            self.config,
            "codex/feature/web/1.1.0/parity-contract",
            "version/web/1.1.0",
            "Target-Delivery-Unit: web\n"
            "Target-Version: 1.1.0\n"
            "Delivery-Profile: web-release-train\n",
            [
                ".omo/evidence/bookgolas-web-app-parity/receipt.md",
                "supabase/migrations/20260910000000_progress.sql",
                "supabase/functions/reading-insights/index.ts",
            ],
            self.registry,
        )
        self.assertIn("web-release-train", result)

    def test_rejects_web_1_0_2_version_paths(self):
        for path in (
            ".omo/evidence/bookgolas-web-app-parity/receipt.md",
            "supabase/migrations/20260910000000_progress.sql",
            "supabase/functions/reading-insights/index.ts",
        ):
            with self.subTest(path=path):
                with self.assertRaisesRegex(
                    PolicyError, "changed paths are outside delivery unit web"
                ):
                    validate(
                        self.config,
                        "codex/feature/web/1.0.2/legacy-admin",
                        "version/web/1.0.2",
                        "Target-Delivery-Unit: web\n"
                        "Target-Version: 1.0.2\n"
                        "Delivery-Profile: web-release-train\n",
                        [path],
                        self.registry,
                    )

    def test_rejects_malformed_sibling_version_override(self):
        self.config["delivery_units"]["web"][
            "additional_allowed_paths_by_version"
        ]["1.0.2"] = None
        with self.assertRaisesRegex(
            PolicyError, "invalid additional paths for 1.0.2"
        ):
            validate(
                self.config,
                "codex/feature/web/1.1.0/parity-contract",
                "version/web/1.1.0",
                "Target-Delivery-Unit: web\n"
                "Target-Version: 1.1.0\n"
                "Delivery-Profile: web-release-train\n",
                ["web/src/app/page.tsx"],
                self.registry,
            )


class WebPromotionTests(unittest.TestCase):
    def test_accepts_web_release_promotion_to_dev(self):
        config = {
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {
                "web": {
                    "profile": "web-release-train",
                    "mode": "version-line",
                    "active_versions": ["1.0.2", "1.1.0"],
                    "target_version_source": ".byungskerlab/release-lines.json",
                    "production_branch": "main",
                    "promotion_bases": ["main", "dev"],
                    "allowed_paths": [
                        "AGENTS.md",
                        ".github/workflows/quality.yml",
                        "docs/**",
                        "web/**",
                    ],
                    "additional_allowed_paths_by_version": {
                        "1.1.0": [
                            ".omo/evidence/bookgolas-web-app-parity/**",
                            "supabase/migrations/**",
                            "supabase/functions/**",
                        ],
                    },
                },
            },
        }
        registry = {
            "delivery_units": {
                "web": {
                    "active_versions": ["1.0.2", "1.1.0"],
                    "promotion_sources": {
                        "release": {
                            "1.1.0": {
                                "branch": "version/web/1.1.0",
                                "sha": "52e9c1db19b307200acef66eef73b86122b315d8",
                            },
                        },
                    },
                },
            },
        }
        result = validate(
            config,
            "codex/release/web/1.1.0",
            "dev",
            "Target-Delivery-Unit: web\n"
            "Target-Version: 1.1.0\n"
            "Delivery-Profile: web-release-train\n"
            "Promotion-Source-SHA: 52e9c1db19b307200acef66eef73b86122b315d8\n",
            ["web/src/app/page.tsx"],
            registry,
            ancestry_checker=lambda _sha: True,
        )
        self.assertIn("web-release-train", result)


if __name__ == "__main__":
    unittest.main()
