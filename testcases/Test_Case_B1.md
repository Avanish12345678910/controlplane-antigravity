### B1. Hallucinated Local Import

**Purpose:** Confirms `PerformanceEngine` flags an import path pointing to a file that doesn't exist in the workspace.

**Model:** gpt-4o

**Prompt:**

```
Can you write a helper to deploy my service?
```

**Mock AI Response:**

```
Here's the updated code:

import { deployService } from './nonexistent-deploy-utils';

function deploy() {
    return deployService();
}
```

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | PASS | No secrets in prompt |
| Cost | Depends | Short prompt, likely LOW, may suggest downgrade |
| Performance | ESCALATE | 1 finding: hallucinated_import, local file ./nonexistent-deploy-utils not found via LocalFileIndexer |

**What this shows:** The engine distinguishes local imports, meaning paths starting with a dot or slash, from package imports, and cross-references them against `indexer.getLocalPaths()`. Since this file was invented, it correctly fails the existence check.