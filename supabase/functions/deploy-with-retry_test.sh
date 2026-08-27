#!/usr/bin/env bash

set -euo pipefail

script_path="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/deploy-with-retry.sh"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

run_case() {
  local response="$1"
  local expected_attempts="$2"
  local attempt_file="$temp_dir/attempts"
  local output
  local status

  printf '0' > "$attempt_file"
  export RETRY_TEST_RESPONSE="$response"

  supabase() {
    local attempts
    attempts="$(<"$ATTEMPT_FILE")"
    printf '%s' "$((attempts + 1))" > "$ATTEMPT_FILE"
    printf '%s\n' "$RETRY_TEST_RESPONSE"
    return 1
  }

  export -f supabase

  set +e
  output="$(ATTEMPT_FILE="$attempt_file" EDGE_DEPLOY_RETRY_DELAY_SECONDS=0 "$script_path" test-function --project-ref test-project 2>&1)"
  status=$?
  set -e

  [ "$status" -eq 1 ]
  [ "$(<"$attempt_file")" -eq "$expected_attempts" ]
  printf '%s\n' "$output" | grep -Fq '::error::test-function failed'
}

run_case 'HTTP 522 upstream timeout' 3
run_case 'validation failed' 1
