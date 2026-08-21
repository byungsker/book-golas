import unittest
from pathlib import Path


WORKFLOW = (
    Path(__file__).parents[2] / ".github" / "workflows" / "deploy-edge-functions.yml"
).read_text(encoding="utf-8")


class DeployEdgeWorkflowContractTests(unittest.TestCase):
    def test_manual_dispatch_is_dev_only(self):
        self.assertNotIn("- prod", WORKFLOW)
        self.assertIn('TARGET" != "dev"', WORKFLOW)
        self.assertIn('REF" != "refs/heads/dev"', WORKFLOW)

    def test_manual_dispatch_uses_dev_project_and_secret(self):
        self.assertIn('supabase link --project-ref "$SUPABASE_PROJECT_REF_DEV"', WORKFLOW)
        self.assertIn('SUPABASE_PROJECT_REF_DEV" != "reoiqefoymdsqzpbouxi"', WORKFLOW)
        self.assertIn("REVENUECAT_WEBHOOK_AUTH_KEY_DEV", WORKFLOW)
        self.assertNotIn("SUPABASE_PROJECT_REF_PROD", WORKFLOW)
        self.assertNotIn("REVENUECAT_WEBHOOK_AUTH_KEY_PROD", WORKFLOW)

    def test_workflow_has_read_only_checkout_permission(self):
        self.assertIn("permissions:\n  contents: read", WORKFLOW)
        self.assertIn("uses: actions/checkout@v4\n        with:\n          persist-credentials: false", WORKFLOW)

    def test_dispatch_input_is_not_interpolated_into_shell(self):
        self.assertIn("FUNCTION=\"$FUNCTION_INPUT\"", WORKFLOW)
        self.assertNotIn('FUNCTION="${{ inputs.function_name }}"', WORKFLOW)
        self.assertIn('[[ "$FUNCTION" == -* ]]', WORKFLOW)
        self.assertIn("Function name must not be a CLI option.", WORKFLOW)


if __name__ == "__main__":
    unittest.main()
