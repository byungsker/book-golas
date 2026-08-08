#!/usr/bin/env bash

set -euo pipefail

function_name="${1:?function name is required}"
max_attempts=3
retry_delay_seconds="${EDGE_DEPLOY_RETRY_DELAY_SECONDS:-15}"
attempt=1

while (( attempt <= max_attempts )); do
  echo "Deploying ${function_name}: attempt ${attempt}/${max_attempts}"

  if output="$(supabase functions deploy "$function_name" "${@:2}" 2>&1)"; then
    printf '%s\n' "$output"
    exit 0
  fi

  printf '%s\n' "$output"

  if ! printf '%s\n' "$output" | grep -Eqi 'HTTP[^0-9]*(408|429|500|502|503|504|520|521|522|523|524)|status[^0-9]*(408|429|500|502|503|504|520|521|522|523|524)|connection reset|i/o timeout|network is unreachable|temporary failure|TLS handshake timeout'; then
    echo "::error::${function_name} failed with a non-retryable deployment error."
    exit 1
  fi

  if (( attempt == max_attempts )); then
    echo "::error::${function_name} failed after ${max_attempts} transient dependency-resolution attempts."
    exit 1
  fi

  delay_seconds=$((attempt * retry_delay_seconds))
  echo "::warning::${function_name} encountered a transient deployment failure; retrying in ${delay_seconds}s."
  sleep "$delay_seconds"
  attempt=$((attempt + 1))
done
