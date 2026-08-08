# Bookgolas backend 1.0.2 release plan

- Delivery unit: `backend`
- Target version: `1.0.2`
- Profile: `backend-service`
- Production branch: `main`
- Scope: independent Supabase Edge Function deployment boundary for the 1.0.2 patch

## Release contract

- The manual `deploy-edge-functions.yml` workflow is development-only.
- Production Edge Functions deploy only from `main` through the protected
  `production` environment and the approved production Supabase project ref.
- A backend work branch targets `main`, carries the `backend` delivery unit
  metadata, and must pass the Target Version Contract before review.
- This release line does not authorize a production deployment, secret change,
  migration, or external publication. Those actions remain separately approved
  operations.

## Exit evidence

- Workflow tests prove dev-only manual dispatch and reject production input or
  an unapproved ref/project combination.
- The production workflow exposes the protected environment and verifies the
  approved project ref before deploying.
- The exact reviewed commit, CI checks, and rollback/hold decision are recorded
  before any production execution.
