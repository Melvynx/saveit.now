# Evidence And Reporting

## Evidence Levels

Use the strongest level actually achieved:

1. `static`: reachable code path and missing/present guard inspected;
2. `automated`: focused regression test exercises attacker and valid paths;
3. `local runtime`: behavior observed against local web/Simulator and isolated
   data;
4. `staging`: behavior observed on an explicitly authorized staging target;
5. `production`: low-impact behavior observed on an explicitly authorized
   production target or exact distributed binary.

Never promote one level into another. A build passing is not runtime proof, a
Simulator is not a store binary, and staging proof is not production proof.

## Finding Status

- `CONFIRMED`: reachable attacker-controlled path and security impact proven.
- `FIXED`: confirmed root cause repaired and regression evidence passed.
- `CANDIDATE`: suspicious code or configuration requiring more evidence.
- `NOT REPRODUCED`: an authorized test did not reproduce the claimed behavior.
- `NOT VERIFIABLE`: safe proof is unavailable or would cross a boundary.

Do not report the absence of a visible guard as confirmed when a framework,
provider, platform entitlement, proxy, or shared helper may supply the control.

## Severity Calibration

- `Critical`: practical unauthenticated takeover, broad sensitive data access,
  or reliable payment/entitlement bypass with major impact.
- `High`: substantial privilege, paid-feature, stored-XSS, identity, or token
  compromise requiring limited prerequisites.
- `Medium`: meaningful scoped exposure, cost abuse, missing quota, constrained
  SSRF, unsafe link/WebView path, or auth weakness with practical prerequisites.
- `Low`: limited disclosure or defense-in-depth gap.
- `Info`: secure behavior, quality issue, or observation without impact.

Severity combines exploitability, affected users, data sensitivity, financial
impact, persistence, platform protections, and compensating controls.

## Finding Template

```markdown
### [SEVERITY] Short title — STATUS

- Boundary: component and trust boundary, without live secrets or PII
- Impact: what an attacker could achieve
- Evidence: redacted file/line, test, or runtime observation
- Root cause: trusted value or invariant that was missing
- Remediation: shared enforcement point and regression coverage
- Verification: static | automated | local runtime | staging | production
- Residual risk: remaining limitation or NOT VERIFIABLE evidence
```

Also list tested secure boundaries. This prevents future audits from converting
known negative checks into findings and makes partial coverage explicit.

## Redaction Rules

Never include session/recovery tokens, cookies, receipts, API keys, webhook
secrets, full provider IDs, push tokens, personal data, private URLs, complete
database rows, or reusable exploit payloads. Use placeholders and describe the
invariant.
