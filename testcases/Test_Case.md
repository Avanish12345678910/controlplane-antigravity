# ControlPlane VSCode — Test Case Library

This document contains ready-to-use test inputs for the `ControlPlane: Scan Prompt` panel.

Test cases are split into two categories:

- **Type A — Prompt Only**: Tests the outbound path (ResponsibilityEngine + CostEngine). Leave the "Mock AI Response" box empty.
- **Type B — Prompt + Mock Response**: Additionally tests the inbound path (PerformanceEngine) by providing a fake AI-generated response.

## Index of Test Cases

| ID | Name | Type | Purpose |
|---|---|---|---|
| A1 | Single Secret Detection (AWS Key) | Prompt Only | Confirms a single hardcoded AWS key is detected and flagged for redaction |
| A2 | Multiple Secrets in One Prompt | Prompt Only | Confirms multiple distinct secret types are detected in a single scan |
| A3 | Simple Prompt → Cost Downgrade Suggested | Prompt Only | Confirms a short, simple prompt triggers a model downgrade suggestion |
| A4 | Complex Prompt → No Downgrade | Prompt Only | Confirms a prompt containing a code block is classified as high complexity and not downgraded |
| A5 | Clean Prompt on a Mini Model | Prompt Only | Confirms no further downgrade is suggested when already on the cheapest model |
| B1 | Hallucinated Local Import | Prompt + Response | Confirms a fake local file import is flagged as hallucinated |
| B2 | Hallucinated Third-Party Dependency | Prompt + Response | Confirms a fake npm package import is flagged as hallucinated |
| B3 | Multiple Deprecated APIs | Prompt + Response | Confirms several deprecated API usages are detected in one response |
| B4 | Combined Test — Secrets + Cost + Hallucinations | Prompt + Response | Stress-tests all three engines simultaneously in one scan |
| B5 | Clean Response — No Hallucinations (Negative Test) | Prompt + Response | Confirms no false positives occur on a normal, self-contained response |
| B6 | Path Reference (Non-Import) Hallucination | Prompt + Response | Confirms a hallucinated file path mentioned outside of an import statement is still flagged |

Each test case below includes: its purpose, the model to select, the exact prompt/response text to paste, the expected badges per section, and a short explanation of what internal engine behavior it demonstrates.