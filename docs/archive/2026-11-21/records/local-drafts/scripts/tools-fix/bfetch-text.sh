#!/usr/bin/env bash
# Browser-session text fetch. Existing positional arguments remain supported.
# Usage: bfetch-text.sh <origin_url> <fetch_url> <out_file> [wait_seconds] [--target-id ID]
# A matching tab is reused or created once. Never navigates the first/default tab.
set -euo pipefail
DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
origin="${1:?origin required}"
target="${2:?target required}"
out="${3:?output required}"
shift 3
wait_seconds=6
if [ "$#" -gt 0 ] && [[ "$1" != --* ]]; then wait_seconds="$1"; shift; fi
exec node "$DIR/browser-text.mjs" fetch "$origin" "$target" "$out" --wait "$wait_seconds" "$@"
