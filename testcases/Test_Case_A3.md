### A3. Simple Prompt → Cost Downgrade Suggested

**Purpose:** Confirms `CostEngine` correctly classifies a short, simple prompt as LOW complexity and suggests downgrading from gpt-4o to gpt-4o-mini.

**Model:** gpt-4o

**Prompt:**

```
What is 2+2?
```

**Mock AI Response:** (leave empty)

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | PASS | No secrets |
| Cost | EDIT | Tokens under 80, 2 lines or fewer, no code blocks → LOW complexity → suggests gpt-4o-mini, roughly 90 percent savings |
| Performance | PASS | Skipped |

**What this shows:** This exercises the core cost-optimization logic in `CostEngine.analyze()`. The three conditions — token count under 80, two lines or fewer, and no code blocks — must all be true to classify as LOW. Since none of them fail here, a downgrade is proposed.