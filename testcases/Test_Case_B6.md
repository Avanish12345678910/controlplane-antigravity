### B6. Path Reference (Non-Import) Hallucination

**Purpose:** Confirms `PerformanceEngine` also flags hallucinated file paths that appear in quotes but are not part of an import or require statement, such as a config path mentioned in prose.

**Model:** gpt-4o

**Prompt:**

```
Where should I store the config file for this service?
```

**Mock AI Response:**

```
You should save your settings to './config/deploy-settings.json' and reference it in your startup script.
```

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | PASS | No secrets |
| Cost | Depends | Likely LOW |
| Performance | ESCALATE | 1 finding: hallucinated_path, ./config/deploy-settings.json not found in workspace |

**What this shows:** The engine has a separate regex pass, called pathRegex, specifically for quoted relative paths that aren't part of an import or require statement. This means it can catch an AI inventing a config file path in plain explanation text, not just in code imports.