#!/usr/bin/env bash
set -euo pipefail

functions_dir="${1:-supabase/functions}"

if ! command -v grep >/dev/null 2>&1; then
  echo "::error::grep is required to validate Edge Function imports."
  exit 1
fi

if grep -R -n --include='*.ts' 'https://esm\.sh/' "$functions_dir"; then
  echo "::error::Edge Functions must not import esm.sh directly."
  exit 1
else
  scanner_status=$?
  if [ "$scanner_status" -ne 1 ]; then
    echo "::error::Edge Function import scanner failed with exit code $scanner_status."
    exit "$scanner_status"
  fi
fi

echo "No direct esm.sh Edge Function imports found."
