#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
scanner="$script_dir/verify-no-esm-imports.sh"
temp_dir="$(mktemp -d)"

trap 'rm -rf "$temp_dir"' EXIT

mkdir -p "$temp_dir/clean" "$temp_dir/direct-esm"
printf 'export const source = "npm:@supabase/supabase-js@2.110.8";\n' > "$temp_dir/clean/index.ts"
"$scanner" "$temp_dir/clean"

for invalid_root in "$temp_dir/missing" "$temp_dir/not-a-directory"; do
  if [ "$invalid_root" = "$temp_dir/not-a-directory" ]; then
    printf 'not a directory\n' > "$invalid_root"
  fi

  set +e
  output="$("$scanner" "$invalid_root" 2>&1)"
  scanner_status=$?
  set -e

  if [ "$scanner_status" -eq 0 ]; then
    echo "Expected invalid scan root to fail validation: $invalid_root"
    exit 1
  fi

  printf '%s\n' "$output" | grep -Fq '::error::Edge Function scan root must be an existing directory.'
done

printf 'import "https://esm.sh/@supabase/supabase-js@2";\n' > "$temp_dir/direct-esm/index.ts"
set +e
output="$("$scanner" "$temp_dir/direct-esm" 2>&1)"
scanner_status=$?
set -e

if [ "$scanner_status" -ne 1 ]; then
  echo "Expected direct esm.sh imports to fail validation."
  exit 1
fi

printf '%s\n' "$output" | grep -Fq 'https://esm.sh/'
printf '%s\n' "$output" | grep -Fq '::error::Edge Functions must not import esm.sh directly.'
