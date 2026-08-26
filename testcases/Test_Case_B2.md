### B2. Hallucinated Third-Party Dependency

**Purpose:** Confirms `PerformanceEngine` flags an npm package import that isn't declared in the workspace's dependencies.

**Model:** gpt-4o

**Prompt:**

```
Add input validation to this function
```

**Mock AI Response:**

```
import validator from 'fake-package-xyz';

function validateInput(data) {
    return validator.isValid(data);
}
```

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | PASS | No secrets |
| Cost | Depends | Likely LOW |
| Performance | ESCALATE | 1 finding: hallucinated_import, fake-package-xyz not in deps from LocalFileIndexer.getDependencies(), and not in the BUILTINS set either |

**What this shows:** For non-relative imports, the engine checks the base package name against both known Node builtins, such as fs, path, and react, and the workspace's actual package.json dependencies. A package matching neither is flagged as hallucinated, simulating an AI inventing a library that doesn't exist.