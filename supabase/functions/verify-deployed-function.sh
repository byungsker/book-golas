#!/usr/bin/env bash

set -euo pipefail

function_name="${1:?function name is required}"
project_ref="${2:?project ref is required}"
endpoint="https://${project_ref}.supabase.co/functions/v1/${function_name}"
status_code="$(curl --silent --show-error --max-time 20 \
  --output /dev/null --write-out '%{http_code}' \
  --request POST "$endpoint" \
  --header 'Content-Type: application/json' \
  --data '{}')"

case "$status_code" in
  404)
    echo "::error::${function_name} endpoint is missing after deployment"
    exit 1
    ;;
  200|400|401|403|405|502|503)
    echo "${function_name} endpoint responded with expected runtime status: ${status_code}"
    ;;
  *)
    echo "::error::Unexpected ${function_name} endpoint status: ${status_code}"
    exit 1
    ;;
esac
