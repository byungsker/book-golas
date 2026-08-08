import unittest
from pathlib import Path


WORKFLOW = (
    Path(__file__).parents[2] / ".github" / "workflows" / "ios-production.yml"
).read_text(encoding="utf-8")


class ProductionEdgeWorkflowContractTests(unittest.TestCase):
    def test_production_job_requires_main_ref_guard(self):
        self.assertIn("guard-production-ref:", WORKFLOW)
        self.assertIn("needs: guard-production-ref", WORKFLOW)
        self.assertIn('REF" != "refs/heads/main"', WORKFLOW)
        self.assertIn("environment:\n      name: production", WORKFLOW)

    def test_production_project_ref_is_pinned(self):
        self.assertIn('test "$SUPABASE_PROJECT_REF_PROD" = "enyxrgxixrnoazzgqyyd"', WORKFLOW)
        self.assertIn("SUPABASE_PROJECT_REF_PROD", WORKFLOW)

    def test_workflow_has_read_only_contents_permission(self):
        self.assertIn("permissions:\n  contents: read", WORKFLOW)


if __name__ == "__main__":
    unittest.main()
