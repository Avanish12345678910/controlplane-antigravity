# ControlPlane VSCode — Usage Guide

This guide explains how to run, use, and test the ControlPlane VSCode extension in VS Code.

---

## 1. Prerequisites

- VS Code `^1.80.0`
- Node.js installed (for `npm install` / `npm run compile`)
- A workspace folder open in VS Code (required for the Performance/Hallucination engine to index local files)

---

## 2. Installation & Launch

Run the following commands in your project root:

```bash
npm install
npm run compile
```

Then press **F5** in VS Code. This opens a new **Extension Development Host** window with ControlPlane VSCode active.

You'll see a message in the **Output → ControlPlane** channel similar to this:

```
[ControlPlane] Proxy started on http://127.0.0.1:54321
```

This confirms the extension activated successfully and the internal HTTP proxy is listening on a random local port.

---

## 3. Two Ways to Use ControlPlane VSCode

ControlPlane VSCode can be exercised in two independent ways. Both use the same underlying engines, so results are consistent between them — they just differ in how input reaches the engines.

| Method | Best for | Requires |
|---|---|---|
| A. HTTP Proxy Simulation (`test-proxy.js`) | Simulating real AI API traffic end-to-end through the actual proxy server | Node.js, the port from the Output channel |
| B. Manual Scan Panel (`ControlPlane: Scan Prompt`) | Quick, interactive testing without needing HTTP traffic; testing hallucination detection with mock responses | Just VS Code, no terminal needed |

---

## 4. Method A — HTTP Proxy Simulation

Follow these steps:

1. Launch the extension by pressing **F5**.
2. Copy the port number shown in the Output channel, for example `54321`.
3. Open a terminal and run:

```bash
node test-proxy.js 54321
```

4. This script sends 5 predefined test requests through the real proxy pipeline (`interceptManager.ts`).
5. Watch the **ControlPlane** output channel in the Extension Development Host window to see how each request was intercepted, scanned, and modified.
6. After the script finishes, open the Command Palette and run **ControlPlane: Show Dashboard** to see aggregate session stats — secrets redacted, tokens saved, and total requests processed.

**Important note:** This method only fully exercises the outbound path, meaning the Responsibility and Cost engines. The Performance (Hallucination) engine is not exercised by `test-proxy.js`, because it requires a real AI-generated response to scan. Testing that engine requires Method B below.

---

## 5. Method B — Manual Scan Panel

Follow these steps:

1. Launch the extension by pressing **F5**.
2. Open a file in the Extension Development Host editor first, for example any file already in your workspace. This step is required if you plan to test the "Send to Diagnostics" feature later.
3. Open the Command Palette using `Ctrl+Shift+P` on Windows/Linux or `Cmd+Shift+P` on Mac.
4. Run the command **ControlPlane: Scan Prompt**.
5. A webview panel will open containing the following elements:
   - A **Model** dropdown to select which AI model to simulate
   - An **Outbound Prompt** textarea, representing what a developer would send to an AI
   - A **Mock AI Response** textarea (optional), representing what the AI sends back
   - A **Run Scan** button
   - A **Clear Diagnostics** button
   - A **Verbose logging** checkbox

6. Fill in the Outbound Prompt field, and optionally the Mock AI Response field, then click **Run Scan**.

7. Three result sections will appear below:

| Section | Engine | Badge meaning |
|---|---|---|
| Responsibility (Data Leaks) | ResponsibilityEngine | PASS means no secrets found, EDIT means secrets found and redaction is suggested |
| Cost Optimization | CostEngine | PASS means no cheaper model available, EDIT means a downgrade is suggested |
| Performance (Hallucinations) | PerformanceEngine | PASS means no issues found or no mock response was given, ESCALATE means hallucinations or deprecated APIs were found |

8. For each finding, you can take action directly from the panel:
   - Click **Apply Redaction** to preview the sanitized prompt with secrets replaced by placeholders like `[REDACTED:AWS_KEY]`
   - Click **Use `<model>`** to simulate accepting the cheaper model suggestion. This does not actually modify any real request, since this is a test tool only.
   - Click **Send to Diagnostics** to push hallucination findings into the currently active file as VS Code diagnostics, which appear as squiggly underlines and entries in the Problems panel.
   - Click **Clear Diagnostics** at any time to remove all ControlPlane diagnostics from the active file.

---

## 6. Verbose Logging — When to Use It

The **Verbose logging** checkbox is unchecked by default. When checked, it writes additional entries to the shared **ControlPlane** output channel, such as the example below:

```
──────── [ScanPrompt #3] 9:52:46 PM ────────
[ScanPrompt] Outbound → EDIT (Secrets detected)
[ScanPrompt] Inbound  → ESCALATE (Hallucinations or issues detected)
```

You should turn Verbose logging **ON** in the following situations:

- When debugging an unexpected result, since it provides a timestamped trail of what the engines actually decided
- When demoing the extension to teammates or judges, since it proves a real backend pipeline is firing rather than just a static mockup
- When running many scans back-to-back and you need a written record of what each scan concluded
- When confirming that an action such as redaction, model swapping, or sending diagnostics was actually triggered internally, not just shown visually

You should leave Verbose logging **OFF** in the following situation:

- During normal day-to-day manual testing, since leaving it off avoids cluttering the same output channel that the live proxy also writes to during real traffic

---

## 7. Configuration Settings

These settings can be changed in your VS Code `settings.json` file:

| Setting | Type | Default | Description |
|---|---|---|---|
| `controlplane.responsibility.enabled` | boolean | true | Enables or disables secret detection |
| `controlplane.cost.enabled` | boolean | true | Enables or disables cost and model routing checks |
| `controlplane.performance.enabled` | boolean | true | Enables or disables hallucination detection |
| `controlplane.latencyBudgetMs` | number | 50 | Maximum time in milliseconds each engine is allowed before being skipped by the latency guard |

Example `settings.json` snippet:

```json
{
  "controlplane.responsibility.enabled": true,
  "controlplane.cost.enabled": true,
  "controlplane.performance.enabled": true,
  "controlplane.latencyBudgetMs": 50
}
```

---

## 8. Important Notes and Known Behaviors

- The "Send to Diagnostics" feature targets the last active text editor, not necessarily a file that matches the mock response's content. Line numbers in the diagnostics come directly from the mock response text you typed, not from real file content. This is expected behavior, since the tool is testing engine logic rather than performing real file analysis.
- The Manual Scan Panel is fully isolated from the live proxy's statistics. Running scans through the panel will not affect the numbers shown by **ControlPlane: Show Dashboard**. This separation is intentional, so manual testing never pollutes real session metrics.
- Diagnostics require an open editor. If no file is open when you click "Send to Diagnostics," you will see a warning message instead of squiggly underlines appearing.
- Closing and reopening the Scan Prompt panel will clear its textareas, since panel state is not persisted after full disposal.

---

## 9. Quick Reference — Available Commands

| Command | What it does |
|---|---|
| ControlPlane: Show Dashboard | Displays session stats gathered from real proxy traffic, including secrets redacted, tokens saved, and hallucinations flagged |
| ControlPlane: Scan Prompt | Opens the manual testing panel described in Method B above |

---

## 10. Next Steps

Refer to `testcases/Test_Case.md` for a complete library of ready-to-use test inputs covering every engine and edge case, including both prompt-only tests and prompt-plus-response tests.