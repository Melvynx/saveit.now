#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"

if [[ ! -d "$root" ]]; then
  echo "error: directory not found: $root" >&2
  exit 2
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "error: rg is required" >&2
  exit 2
fi

common_globs=(
  --hidden
  --glob '*.{ts,tsx,js,mjs,cjs,json,toml,yaml,yml}'
  --glob '!**/.git/**'
  --glob '!**/.agents/**'
  --glob '!**/node_modules/**'
  --glob '!**/.expo/**'
  --glob '!**/ios/**'
  --glob '!**/android/**'
  --glob '!**/.output/**'
  --glob '!**/dist/**'
  --glob '!**/build/**'
  --glob '!**/coverage/**'
  --glob '!**/convex/_generated/**'
  --glob '!**/*.lock'
  --glob '!**/.env*'
)

scan() {
  local title="$1"
  local pattern="$2"
  local matches

  matches="$(rg -l -i "${common_globs[@]}" -- "$pattern" "$root" 2>/dev/null || true)"
  printf '\n[%s]\n' "$title"
  if [[ -z "$matches" ]]; then
    echo "(no candidate files)"
  else
    printf '%s\n' "$matches" | LC_ALL=C sort -u
  fi
}

echo "NS mobile security candidate scan (paths only; no finding is confirmed)"
echo "root: $(cd "$root" && pwd)"

scan "payments, receipts, and entitlements" \
  'sk_test_|pk_test_|livemode|receipt|transactionId|purchaseToken|productId|entitlement|payment.*status|checkout.*success'
scan "authorization and broad backend reads" \
  'userId|ownerId|organizationId|requireAuth|auth(Query|Mutation|Action)|admin(Query|Mutation|Action)|ctx\.auth|\.filter\(|\.collect\('
scan "privileged fields and client-owned state" \
  '(patch|update).*(role|plan|status|paid|verified|owner|limit)|isAdmin|emailVerified|AsyncStorage|SecureStore'
scan "public client secrets and environment boundaries" \
  'EXPO_PUBLIC_|extra:|Constants\.expoConfig|process\.env|secret|apiKey|clientSecret|privateKey'
scan "auth lifecycle and token handling" \
  'rateLimit|password.*reset|refresh.*token|session.*token|bearer|authorization|otp|verificationToken'
scan "deep links, WebViews, and push navigation" \
  'Linking\.|createURL|scheme|associatedDomains|intentFilters|WebView|injectedJavaScript|notification.*data|pushToken'
scan "uploads and object storage" \
  'PutObject|presign|getUploadUrl|contentType|mime|R2_|storageId|objectKey'
scan "XSS, outbound URLs, and webhooks" \
  'dangerouslySetInnerHTML|innerHTML|markdown|sanitize|webhook.*url|callback.*url|new URL\(|fetch\('
scan "CORS, headers, and verbose errors" \
  'access-control-allow-origin|content-security-policy|frame-ancestors|x-content-type-options|referrer-policy|stackTrace|serialize.*error'

printf '\nReview every listed file manually. Absence from this output is not proof of safety.\n'
