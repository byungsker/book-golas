import hashlib
import json
import unittest

from validate_target_version_pr import (
    PolicyError,
    read_release_contract,
    validate,
    validate_planned_sync_manifest,
    validate_prospective_policy_files,
    validate_release_line_registry,
)


class DeliveryUnitNameTests(unittest.TestCase):
    def test_reads_markdown_and_json_release_contracts(self):
        read_release_contract(
            json.dumps({
                "deliveryUnit": "client",
                "targetVersion": "1.1.0",
                "deliveryProfile": "web-release-train",
            }),
            "client",
            "1.1.0",
            "web-release-train",
            "docs/client-release.json",
        )
        read_release_contract(
            json.dumps({
                "release": {
                    "delivery_unit": "client",
                    "target_version": "1.1.0",
                    "delivery_profile": "web-release-train",
                },
            }),
            "client",
            "1.1.0",
            "web-release-train",
            "docs/client-ledger.json",
        )
        with self.assertRaisesRegex(PolicyError, "Target-Delivery-Unit mismatch"):
            read_release_contract(
                json.dumps({
                    "release": {
                        "delivery_unit": "web",
                        "target_version": "1.1.0",
                        "delivery_profile": "web-release-train",
                    },
                }),
                "client",
                "1.1.0",
                "web-release-train",
                "docs/client-ledger.json",
            )
        with self.assertRaisesRegex(PolicyError, "duplicate evidence JSON key"):
            read_release_contract(
                '{"deliveryUnit":"web","deliveryUnit":"client",'
                '"targetVersion":"1.1.0","deliveryProfile":"web-release-train"}',
                "client",
                "1.1.0",
                "web-release-train",
                "docs/client-release.json",
            )

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
    def test_accepts_web_release_promotion_to_dev_with_quality_workflow(self):
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
            [".github/workflows/quality.yml", "web/src/app/page.tsx"],
            registry,
            ancestry_checker=lambda _sha: True,
        )
        self.assertIn("web-release-train", result)


class ReleaseLineAttestationTests(unittest.TestCase):
    def setUp(self):
        self.unit = "client"
        self.version = "1.1.0"
        self.profile = "web-release-train"
        self.path = "docs/releases/client-1.1.0.md"
        self.source_sha = "1" * 40
        self.attested_sha = "2" * 40
        self.head_sha = "4" * 40
        self.document = (
            "# Client release evidence\n\n"
            "Target-Delivery-Unit: client\n"
            "Target-Version: 1.1.0\n"
            "Delivery-Profile: web-release-train\n"
        ).encode()
        self.digest = hashlib.sha256(self.document).hexdigest()
        self.config = {
            "schema_version": 2,
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {
                "client": {
                    "profile": self.profile,
                    "mode": "version-line",
                    "version_line_schema": 2,
                    "active_versions": [self.version],
                    "target_version_source": ".byungskerlab/release-lines.json",
                    "production_branch": "main",
                    "version_line_base_branch": "version/web/1.1.0",
                    "required_evidence_paths": [self.path],
                    "allowed_paths": ["apps/client/**", self.path],
                    "sync_only_paths": [self.path],
                },
            },
        }
        self.record = {
            "status": "active",
            "profile": self.profile,
            "source": {
                "branch": "version/web/1.1.0",
                "sha": self.source_sha,
            },
            "line": {
                "branch": "version/client/1.1.0",
                "seed_sha": self.source_sha,
                "attested_sha": self.attested_sha,
            },
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
        }
        self.registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [self.version],
                    "versions": {self.version: self.record},
                },
            },
        }

    def test_accepts_attested_active_line_and_bound_product_work(self):
        validate_release_line_registry(self.config, self.registry)
        result = validate(
            self.config,
            "codex/feature/client/1.1.0/routes",
            "version/client/1.1.0",
            "Target-Delivery-Unit: client\n"
            "Target-Version: 1.1.0\n"
            "Delivery-Profile: web-release-train\n",
            ["apps/client/src/app/page.tsx"],
            self.registry,
            line_ancestry_checker=lambda ancestor, descendant: (
                ancestor == self.attested_sha and descendant == self.head_sha
            ),
            content_fetcher=lambda _ref, _path: self.document,
            pr_head_sha=self.head_sha,
        )
        self.assertIn("unit=client", result)

    def test_rejects_active_version_without_attested_record(self):
        self.registry["delivery_units"]["client"]["versions"][self.version]["line"][
            "attested_sha"
        ] = None
        with self.assertRaisesRegex(PolicyError, "requires an attested SHA"):
            validate_release_line_registry(self.config, self.registry)

    def test_rejects_active_list_not_matching_active_records(self):
        self.registry["delivery_units"]["client"]["active_versions"] = []
        self.config["delivery_units"]["client"]["active_versions"] = []
        with self.assertRaisesRegex(PolicyError, "exactly match active release-line records"):
            validate_release_line_registry(self.config, self.registry)

    def test_rejects_evidence_hash_drift(self):
        with self.assertRaisesRegex(PolicyError, "SHA-256 mismatch"):
            validate_release_line_registry(
                self.config,
                self.registry,
                content_fetcher=lambda _ref, _path: self.document + b"drift",
                ancestry_checker=lambda _ancestor, _descendant: True,
            )

    def test_rejects_version_line_missing_seed_ancestry(self):
        with self.assertRaisesRegex(PolicyError, "does not descend from"):
            validate_release_line_registry(
                self.config,
                self.registry,
                content_fetcher=lambda _ref, _path: self.document,
                ancestry_checker=lambda _ancestor, _descendant: False,
            )

    def test_rejects_evidence_with_duplicate_metadata(self):
        duplicate = self.document + b"Target-Version: 1.1.0\n"
        record = self.registry["delivery_units"]["client"]["versions"][self.version]
        record["evidence_refs"][0]["sha256"] = hashlib.sha256(duplicate).hexdigest()
        with self.assertRaisesRegex(PolicyError, "exactly one line"):
            validate_release_line_registry(
                self.config,
                self.registry,
                content_fetcher=lambda _ref, _path: duplicate,
                ancestry_checker=lambda _ancestor, _descendant: True,
            )

    def test_accepts_exact_planned_document_sync(self):
        record = self.record.copy()
        record["status"] = "planned"
        record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = self.config.copy()
        config["delivery_units"] = {
            "client": {
                **self.config["delivery_units"]["client"],
                "active_versions": [],
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [],
                    "versions": {self.version: record},
                },
            },
        }
        result = validate(
            config,
            "codex/sync/client/1.1.0/release-evidence",
            "version/client/1.1.0",
            "Target-Delivery-Unit: client\n"
            "Target-Version: 1.1.0\n"
            "Delivery-Profile: web-release-train\n",
            [self.path],
            registry,
            line_ancestry_checker=lambda _ancestor, _descendant: True,
            content_fetcher=lambda _ref, _path: self.document,
            pr_head_sha=self.head_sha,
            pr_base_sha=self.source_sha,
        )
        self.assertIn("unit=client", result)

    def test_planned_sync_manifest_hashes_registered_test_files(self):
        script_path = "web/scripts/test-release-config.mjs"
        script = b'requireCondition(config.deliveryUnit === "client")'
        script_digest = hashlib.sha256(script).hexdigest()
        policy = {
            "planned_sync_paths": [self.path, script_path],
            "sync_only_paths": [self.path, script_path],
        }
        sync = {
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "sync_paths": [self.path, script_path],
            "sync_hashes": [
                {"path": self.path, "sha256": self.digest},
                {"path": script_path, "sha256": script_digest},
            ],
        }
        validate_planned_sync_manifest(
            sync,
            policy,
            [self.path],
            ref=self.head_sha,
            content_fetcher=lambda _ref, path: self.document if path == self.path else script,
        )
        sync["sync_hashes"][1]["sha256"] = "0" * 64
        with self.assertRaisesRegex(PolicyError, "SHA-256 mismatch"):
            validate_planned_sync_manifest(
                sync,
                policy,
                [self.path],
                ref=self.head_sha,
                content_fetcher=lambda _ref, path: self.document if path == self.path else script,
            )

    def test_rejects_planned_product_work(self):
        record = self.record.copy()
        record["status"] = "planned"
        record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = self.config.copy()
        config["delivery_units"] = {
            "client": {
                **self.config["delivery_units"]["client"],
                "active_versions": [],
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [],
                    "versions": {self.version: record},
                },
            },
        }
        with self.assertRaisesRegex(PolicyError, "not active for client"):
            validate(
                config,
                "codex/feature/client/1.1.0/routes",
                "version/client/1.1.0",
                "Target-Delivery-Unit: client\n"
                "Target-Version: 1.1.0\n"
                "Delivery-Profile: web-release-train\n",
                ["apps/client/src/app/page.tsx"],
                registry,
            )

    def test_rejects_planned_sync_with_extra_paths(self):
        record = self.record.copy()
        record["status"] = "planned"
        record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = self.config.copy()
        config["delivery_units"] = {
            "client": {
                **self.config["delivery_units"]["client"],
                "active_versions": [],
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [],
                    "versions": {self.version: record},
                },
            },
        }
        with self.assertRaisesRegex(PolicyError, "exact planned seed and sync paths"):
            validate(
                config,
                "codex/sync/client/1.1.0/release-evidence",
                "version/client/1.1.0",
                "Target-Delivery-Unit: client\n"
                "Target-Version: 1.1.0\n"
                "Delivery-Profile: web-release-train\n",
                [self.path, "docs/extra.md"],
                registry,
                line_ancestry_checker=lambda _ancestor, _descendant: True,
                content_fetcher=lambda _ref, _path: self.document,
                pr_head_sha=self.head_sha,
                pr_base_sha=self.source_sha,
            )

    def test_validates_prospective_policy_and_planned_evidence_at_pr_head(self):
        record = self.record.copy()
        record["status"] = "planned"
        record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = self.config.copy()
        config["delivery_units"] = {
            "client": {
                **self.config["delivery_units"]["client"],
                "active_versions": [],
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [],
                    "versions": {self.version: record},
                },
            },
        }
        policy_content = json.dumps(config).encode()
        registry_content = json.dumps(registry).encode()
        files = {
            (self.head_sha, ".byungskerlab/branch-policy.json"): policy_content,
            (self.head_sha, ".byungskerlab/release-lines.json"): registry_content,
            (self.head_sha, self.path): self.document,
        }
        validate_prospective_policy_files(
            self.config,
            self.registry,
            [".byungskerlab/branch-policy.json", ".byungskerlab/release-lines.json"],
            self.head_sha,
            lambda ref, path: files[(ref, path)],
            lambda _ancestor, _descendant: True,
        )

    def test_skips_pr_head_evidence_fetch_for_unchanged_planned_record(self):
        record = self.record.copy()
        record["status"] = "planned"
        record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = self.config.copy()
        config["delivery_units"] = {
            "client": {
                **self.config["delivery_units"]["client"],
                "active_versions": [],
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [],
                    "versions": {self.version: record},
                },
            },
        }
        files = {
            (self.head_sha, ".byungskerlab/branch-policy.json"): json.dumps(config).encode(),
            (self.head_sha, ".byungskerlab/release-lines.json"): json.dumps(registry).encode(),
        }
        fetched_paths: list[str] = []

        def fetch(ref: str, path: str) -> bytes:
            fetched_paths.append(path)
            if path == self.path:
                return self.document + b"changed"
            return files[(ref, path)]

        validate_release_line_registry(
            config,
            registry,
            content_fetcher=fetch,
            ancestry_checker=lambda _ancestor, _descendant: True,
            pr_head_sha=self.head_sha,
        )
        validate_prospective_policy_files(
            config,
            registry,
            [".byungskerlab/branch-policy.json"],
            self.head_sha,
            fetch,
            lambda _ancestor, _descendant: True,
        )

        self.assertNotIn(self.path, fetched_paths)

    def test_rejects_prospective_planned_document_hash_drift(self):
        record = self.record.copy()
        record["status"] = "planned"
        record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = self.config.copy()
        config["delivery_units"] = {
            "client": {
                **self.config["delivery_units"]["client"],
                "active_versions": [],
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "client": {
                    "active_versions": [],
                    "versions": {self.version: record},
                },
            },
        }
        files = {
            (self.head_sha, ".byungskerlab/branch-policy.json"): json.dumps(config).encode(),
            (self.head_sha, ".byungskerlab/release-lines.json"): json.dumps(registry).encode(),
            (self.head_sha, self.path): self.document + b"drift",
        }
        with self.assertRaisesRegex(PolicyError, "SHA-256 mismatch"):
            validate_prospective_policy_files(
                self.config,
                self.registry,
                [".byungskerlab/branch-policy.json", ".byungskerlab/release-lines.json"],
                self.head_sha,
                lambda ref, path: files[(ref, path)],
                lambda _ancestor, _descendant: True,
            )

    def test_accepts_explicit_legacy_lines_with_attested_successor_records(self):
        client_record = self.record.copy()
        client_record["status"] = "planned"
        client_record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        client_record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        legacy_policy = {
            "profile": self.profile,
            "mode": "version-line",
            "version_line_schema": 1,
            "active_versions": [self.version],
            "target_version_source": ".byungskerlab/release-lines.json",
            "production_branch": "main",
            "allowed_paths": ["web/**"],
        }
        client_policy = {
            **self.config["delivery_units"]["client"],
            "active_versions": [],
        }
        config = {
            "schema_version": 2,
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {"web": legacy_policy, "client": client_policy},
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "web": {
                    "active_versions": [self.version],
                    "promotion_sources": {"release": {}, "hotfix": {}},
                    "migration_targets": {
                        self.version: {
                            "delivery_unit": "client",
                            "version": self.version,
                            "source_branch": "version/web/1.1.0",
                            "source_sha": self.source_sha,
                        },
                    },
                },
                "client": {
                    "active_versions": [],
                    "versions": {self.version: client_record},
                },
            },
        }
        validate_release_line_registry(
            config,
            registry,
            content_fetcher=lambda _ref, _path: self.document,
            ancestry_checker=lambda _ancestor, _descendant: True,
            pr_head_sha=self.head_sha,
            planned_evidence_records={("client", self.version)},
        )

    def test_rejects_legacy_successor_with_mismatched_seed(self):
        client_record = self.record.copy()
        client_record["status"] = "planned"
        client_record["line"] = {
            "branch": "version/client/1.1.0",
            "seed_sha": self.source_sha,
            "attested_sha": None,
        }
        client_record["document_sync"] = {
            "source_sha": self.source_sha,
            "target": "version/client/1.1.0",
            "evidence_refs": [{"path": self.path, "sha256": self.digest}],
            "consumed": False,
        }
        config = {
            "schema_version": 2,
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {
                "web": {
                    "profile": self.profile,
                    "mode": "version-line",
                    "version_line_schema": 1,
                    "active_versions": [self.version],
                    "target_version_source": ".byungskerlab/release-lines.json",
                    "production_branch": "main",
                    "allowed_paths": ["web/**"],
                },
                "client": {
                    **self.config["delivery_units"]["client"],
                    "active_versions": [],
                },
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "web": {
                    "active_versions": [self.version],
                    "promotion_sources": {"release": {}, "hotfix": {}},
                    "migration_targets": {
                        self.version: {
                            "delivery_unit": "client",
                            "version": self.version,
                            "source_branch": "version/web/1.1.0",
                            "source_sha": "3" * 40,
                        },
                    },
                },
                "client": {
                    "active_versions": [],
                    "versions": {self.version: client_record},
                },
            },
        }
        with self.assertRaisesRegex(PolicyError, "exact successor seed"):
            validate_release_line_registry(config, registry)

    def test_rejects_schema_v2_version_line_without_explicit_line_schema(self):
        config = self.config.copy()
        policy = dict(config["delivery_units"]["client"])
        policy.pop("version_line_schema")
        config["delivery_units"] = {"client": policy}
        with self.assertRaisesRegex(PolicyError, "version_line_schema 1 or 2"):
            validate_release_line_registry(config, self.registry)

    def test_accepts_legacy_product_work_during_schema_v2_transition(self):
        config = {
            "schema_version": 2,
            "allowed_actor_prefixes": ["codex"],
            "delivery_units": {
                "web": {
                    "profile": "web-release-train",
                    "mode": "version-line",
                    "version_line_schema": 1,
                    "active_versions": ["1.0.2"],
                    "target_version_source": ".byungskerlab/release-lines.json",
                    "production_branch": "main",
                    "allowed_paths": ["web/**"],
                    "sync_bases": ["version/web/1.0.2"],
                },
            },
        }
        registry = {
            "schema_version": 2,
            "delivery_units": {
                "web": {
                    "active_versions": ["1.0.2"],
                    "promotion_sources": {"release": {}, "hotfix": {}},
                },
            },
        }
        result = validate(
            config,
            "codex/feature/web/1.0.2/bug-fix",
            "version/web/1.0.2",
            "Target-Delivery-Unit: web\n"
            "Target-Version: 1.0.2\n"
            "Delivery-Profile: web-release-train\n",
            ["web/src/app/page.tsx"],
            registry,
        )
        self.assertIn("unit=web", result)


if __name__ == "__main__":
    unittest.main()
