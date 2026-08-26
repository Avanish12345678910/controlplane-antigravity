### A2. Multiple Secrets in One Prompt

**Purpose:** Confirms multiple distinct secret types are detected simultaneously in a single scan.

**Model:** gpt-4o

**Prompt:**

```
My AWS key is AKIAIOSFODNN7EXAMPLE and my GitHub token is ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij and use Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdef to authenticate
```

**Mock AI Response:** (leave empty)

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | EDIT | 3 findings: AWS key, GitHub PAT, Bearer/JWT token |
| Cost | Depends | Complexity likely LOW or MEDIUM |
| Performance | PASS | Skipped, no mock response |

**What this shows:** The Responsibility engine doesn't stop at the first match. It iterates through every rule in `secretPatterns.ts` and collects every finding across the entire prompt, so multiple leak types in one message are all caught in a single scan.