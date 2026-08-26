### B4. Combined Test — Secrets + Cost + Hallucinations (Full Pipeline)

**Purpose:** Stress-tests all three engines simultaneously in one scan. This is the most comprehensive single test case.

**Model:** gpt-4o

**Prompt:**

```
Here is my AWS key AKIAIOSFODNN7EXAMPLE and my GitHub token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij — please help me write a function to deploy this.
```

**Mock AI Response:**

```
Here's the updated code:

import { deployService } from './nonexistent-deploy-utils';
import fakePackageXYZ from 'fake-package-xyz';

function deploy() {
    const buf = new Buffer('deploy-data');
    ReactDOM.render(<App />, document.getElementById('root'));
    return deployService(buf);
}
```

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | EDIT | 2 findings: AWS key, GitHub PAT |
| Cost | EDIT | Around 38 tokens, LOW complexity, suggests gpt-4o-mini, roughly 90 percent savings |
| Performance | ESCALATE | 4 findings: 2 hallucinated imports plus 2 deprecated APIs |

**What this shows:** This is the canonical "everything at once" scenario, useful for demos since it proves all three risk dimensions can be evaluated independently and simultaneously without one engine's findings suppressing another's in the UI, even though `ActionRouter.decide()` internally prioritizes Responsibility over Performance over Cost when picking a single action for real proxy traffic.