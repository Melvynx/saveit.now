#!/usr/bin/env bash
set -uo pipefail

port=3000
start_stripe=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "Error: -p/--port requires a value" >&2
        exit 1
      fi
      port="$2"
      shift 2
      ;;
    --no-stripe)
      start_stripe=0
      shift
      ;;
    --stripe|--with-stripe)
      start_stripe=1
      shift
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Warning: ignoring unknown arg: $1" >&2
      shift
      ;;
  esac
done

if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1 || port > 65535 )); then
  echo "Error: port must be a number between 1 and 65535" >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1; then
  echo "Error: port $port is already in use" >&2
  exit 1
fi

log_dir="$root/debug-logs/start-all"
web_log="$log_dir/web.txt"
convex_log="$log_dir/convex.txt"
stripe_log="$log_dir/stripe.txt"

mkdir -p "$log_dir"
: > "$web_log"
: > "$convex_log"
: > "$stripe_log"

printf '[start-all] port=%s\n' "$port"
printf '[start-all] web -> http://localhost:%s\n' "$port"
printf '[start-all] web log -> %s\n' "$web_log"
printf '[start-all] convex log -> %s\n' "$convex_log"
if (( start_stripe )); then
  printf '[start-all] stripe log -> %s\n' "$stripe_log"
else
  printf '[start-all] stripe skipped; pass --stripe to listen for billing webhooks\n'
fi

pids=()

cleanup() {
  trap '' INT TERM EXIT
  set +m 2>/dev/null || true
  echo
  echo "[start-all] stopping child processes..."
  for pid in "${pids[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  sleep 0.3
  for pid in "${pids[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  wait "${pids[@]:-}" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

set -m

start_service() {
  local name="$1"
  local color="$2"
  local log_file="$3"
  shift 3

  (
    export LOG="$log_file"
    export PREFIX=$'\033['"$color"$'m['"$name"$']\033[0m'
    "$@" 2>&1 \
      | perl -ne '
          BEGIN {
            $| = 1;
            open(LOG, ">>", $ENV{LOG}) or die "open $ENV{LOG}: $!";
            select((select(LOG), $| = 1)[0]);
          }
          my $c = $_;
          $c =~ s/\033\[[0-9;?]*[a-zA-Z]//g;
          $c =~ s/\r/\n/g;
          print LOG $c;
          print "$ENV{PREFIX} $_";
        '
  ) &
  pids+=("$!")
}

app_url="http://localhost:$port"
convex_site_url="${CONVEX_SITE_URL:-${VITE_CONVEX_SITE_URL:-}}"

start_service "convex" "36" "$convex_log" \
  pnpm --filter @workspace/backend dev

if (( start_stripe )); then
  if [[ -z "$convex_site_url" ]]; then
    echo "[start-all] WARN: CONVEX_SITE_URL or VITE_CONVEX_SITE_URL is required for Stripe forwarding; skipping" >&2
  elif command -v stripe >/dev/null 2>&1; then
    start_service "stripe" "34" "$stripe_log" \
      stripe listen --forward-to "$convex_site_url/stripe/webhook"
  else
    echo "[start-all] WARN: stripe CLI not found; skipping Stripe webhook listener" >&2
  fi
fi

start_service "web" "35" "$web_log" \
  env PORT="$port" \
    SITE_URL="$app_url" \
    VITE_APP_URL="$app_url" \
    BETTER_AUTH_URL="$app_url" \
    PLAYWRIGHT_TEST_BASE_URL="$app_url" \
    pnpm --filter web dev -- --host 0.0.0.0 --port "$port" --strictPort

wait
