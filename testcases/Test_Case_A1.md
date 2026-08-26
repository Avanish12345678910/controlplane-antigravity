### A1. Single Secret Detection (AWS Key)

**Purpose:** Confirms `ResponsibilityEngine` detects a hardcoded AWS Access Key and proposes redaction.

**Model:** gpt-4o

**Prompt:**

```
Here is my AWS key AKIAIOSFODNN7EXAMPLE and please help me deploy
```

**Mock AI Response:** (leave empty)

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | EDIT | 1 finding: AWS Access Key ID → [REDACTED:AWS_KEY] |
| Cost | Depends | Short prompt, no code → likely LOW complexity, may suggest gpt-4o-mini |
| Performance | PASS | No mock response provided — skipped |

**What this shows:** Even a single embedded credential is caught by the secret-pattern regex rules in `secretPatterns.ts`. The Responsibility engine also takes priority over Cost inside `ActionRouter` — meaning even if a cost optimization is also possible, the EDIT/redaction decision is what gets flagged first when routed through the real proxy.