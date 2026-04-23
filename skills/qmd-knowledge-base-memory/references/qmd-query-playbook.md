# QMD Query Playbook For Project Memory

Use this playbook when a task is too large for one obvious search or when prior decisions matter.

## Build The Query From Facets

Good qmd queries combine several facets:

- Product or code surface: `checkout`, `dashboard`, `admin`, `mobile`, `worker`, `API`, `database`
- User or runtime state: `anonymous`, `authenticated`, `offline`, `staging`, `production`, `local`
- Operation: `read`, `write`, `create`, `edit`, `delete`, `sync`, `backfill`, `deploy`, `rollback`
- Technical construct: feature flag, route, table, queue, event name, SDK method, package, config key
- Ticket or phase: issue ID, milestone, PR number, migration phase, release name
- Proof or failure: test suite, command, browser mode, log message, error string, metric, alert

Example:

```bash
qmd --index "$QMD_INDEX" query --json -n 10 --min-score 0.25 \
  "checkout authenticated create order feature flag staging validation"
```

## Use A Three-Pass Retrieval Pattern

### Pass 1: semantic task query

Use `qmd query` for "what is relevant to this task?"

```bash
qmd --index "$QMD_INDEX" query --json -n 10 --min-score 0.25 \
  "remaining payment migration webhook retry idempotency decisions"
```

### Pass 2: exact anchors

Use `qmd search` for weird strings, route paths, suite names, feature flags, table names, or error messages.

```bash
qmd --index "$QMD_INDEX" search --json -n 10 \
  '"PAYMENTS_V2_ENABLED" "POST /webhooks/payment" "duplicate event id"'
```

### Pass 3: proof and decision query

Use qmd to find why a choice was made and what proved it.

```bash
qmd --index "$QMD_INDEX" query --json -n 8 --min-score 0.25 \
  "why preserve legacy webhook retry behavior and what validation proved it"
```

## Retrieve Only What Matters

Read top results with line windows first:

```bash
qmd --index "$QMD_INDEX" get "topic/current-plan.md:120" -l 160
```

Use full documents only when the document is short or the whole plan is needed:

```bash
qmd --index "$QMD_INDEX" get "topic/2026-04-23-validation-runbook.md" --full
```

Use `multi-get` when several top qmd results need to be passed to an agent together:

```bash
qmd --index "$QMD_INDEX" multi-get "#a1b2c3,#d4e5f6,topic/*identity*" --json --max-bytes 20480
```

## Turn Results Into Action

After retrieval, produce these coding anchors:

1. Memory docs that matter.
2. Implementation files likely to change.
3. Existing tests and scripts that prove the surface.
4. Decisions that should not be accidentally reversed.
5. Risks that require runtime, staging, production, or browser validation.

Then inspect code. Do not keep querying qmd when the next unknown is an implementation detail in source.

## Query Examples

### Remaining Work

```bash
qmd --index "$QMD_INDEX" query --json -n 10 \
  "remaining migration cutover rollback validation gaps"
```

### Identity Or Data Sync

```bash
qmd --index "$QMD_INDEX" query --json -n 8 \
  "identity sync provisioning deactivation backfill decision validation"
```

### Test Or Runtime Gotchas

```bash
qmd --index "$QMD_INDEX" search --json -n 10 \
  '"headful" "TLS" "timeout" "staging" "next start"'
```

### Legacy Artifact Cleanup

```bash
qmd --index "$QMD_INDEX" query --json -n 10 \
  "remove legacy artifacts after migration compatibility fallback cleanup"
```
