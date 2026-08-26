### B3. Multiple Deprecated APIs

**Purpose:** Confirms `PerformanceEngine` detects several distinct deprecated-API patterns in the same response.

**Model:** gpt-4o

**Prompt:**

```
Update this React component and buffer handling to modern standards
```

**Mock AI Response:**

```
const buf = new Buffer('deploy-data');
ReactDOM.render(<App />, document.getElementById('root'));
```

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | PASS | No secrets |
| Cost | Depends | Likely LOW |
| Performance | ESCALATE | 2 findings: new Buffer() deprecated, ReactDOM.render() deprecated in React 18+ |

**What this shows:** The DEPRECATED_APIS list in `performanceEngine.ts` is checked independently of the import and path logic, using simple regex matching per line. This means deprecated API usage is flagged even in response snippets that don't contain any imports at all.