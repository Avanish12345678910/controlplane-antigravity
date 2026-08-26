# 🛡️ ControlPlane VSCode

**A protective proxy layer between developers and AI coding assistants — preventing data leaks, optimizing token costs, and catching AI hallucinations in real time.**

Built for the **Accenture Innovation Challenge - 2026**, under **Problem Track 1: ControlPlane.ai**.

---

## 🏆 Hackathon Credit

This project was designed and built as part of the **Accenture Innovation Challenge - 2026**. We're grateful to Accenture for organizing this challenge and providing a platform to turn a real, personally-felt developer pain point into a working prototype.

---

## 🎯 Problem Track Alignment — ControlPlane.ai

The Round 2 brief for this track asks for a **Responsible AI Checker** — a layer that evaluates AI interactions in real time and flags or blocks bias, hallucination risk, or privacy leaks before they cause harm, while acknowledging that enterprises run many different AI use cases at once, each with its own risk and latency tolerance.

We scoped our prototype specifically to the **AI-assisted software development** use case — one of the highest-volume, lowest-latency-tolerance scenarios inside any enterprise adopting generative AI, since developers expect near-instant responses from coding assistants and won't tolerate a slow safety layer.

Here's how our implementation maps to the track's suggested solutioning areas:

| Solutioning Area (from brief) | How ControlPlane VSCode Addresses It |
|---|---|
| **Detection techniques** | Rule-based heuristics for secret/PII detection (regex pattern rules), and retrieval-style verification for hallucination detection — cross-referencing AI output against the actual local workspace (files, dependencies) rather than trusting the AI's claims blindly |
| **Decision logic — tiered responses** | Our `ActionRouter` implements exactly this: every check resolves to one of three tiers — `PASS` (safe, let it through), `EDIT` (auto-redact secrets or reroute to a cheaper model), or `ESCALATE` (surface to the developer via diagnostics for human review) — rather than a binary allow/block |
| **Architecture — pipeline placement** | We chose an **inline middleware / pre-response gate** pattern: a local HTTP proxy sits directly between the developer's tools and the AI API, intercepting both outbound prompts and inbound responses, so checks happen inline without requiring the AI provider's cooperation |
| **Latency protection** | Every engine call is wrapped in a `withTimeout()` latency guard (configurable via `controlplane.latencyBudgetMs`, default 50ms) — if a check exceeds budget, it fails open with a safe default rather than blocking the developer's workflow |
| **Governance — configurable policy** | Each risk dimension (Responsibility, Cost, Performance) can be independently toggled via VS Code settings, simulating a policy layer that could vary by team, project, or risk appetite in a real deployment |
| **Overlapping risk categories** | Our design treats Responsibility, Cost, and Performance as independent, parallel checks rather than a single verdict — directly reflecting the brief's point that risks "often overlap" and shouldn't be forced into one clean category |
| **Feedback loops / Metrics** | Not yet implemented — noted honestly in [What's Next](#-whats-next). Our current prototype logs session-level stats (secrets redacted, tokens saved, hallucinations flagged) as a starting point toward the monitoring/trustworthiness reporting the brief calls for |

We made a deliberate assumption for this prototype: rather than simulating "tens of thousands of interactions per week" across multiple enterprise AI use cases, we focused on proving the **core mechanism** — real-time interception, tiered decision-making, and low-latency checking — on a single, concrete, high-frequency use case (AI coding assistants), which we believe generalizes directly to the broader multi-use-case vision described in the brief.

---

## 💡 Inspiration

While working on our own projects, we kept running into the same frustrating pattern: AI tokens would run out far faster than expected, and half the time we genuinely didn't know which model was the "right" one to use for a given task — should this go to a heavyweight model, or would a cheaper, faster one do the job just as well?

On top of that, we noticed how easy it is to accidentally paste sensitive information — API keys, tokens, credentials — directly into an AI chat prompt without a second thought, since most AI coding assistants don't warn you before that data leaves your machine.

That combination of **wasted tokens, poor model choices, and silent data leaks** is what pushed us to build ControlPlane VSCode — a lightweight safety and optimization layer that sits between a developer and their AI assistant, without getting in the way of the actual workflow.

---

## ⚙️ What It Does

ControlPlane VSCode intercepts outbound AI prompts and inbound AI responses to enforce enterprise-grade safety across three risk dimensions:

- **🔐 Responsibility (Data Leaks):** Detects and redacts hardcoded secrets, API keys, and PII from outbound prompts before they ever leave the machine.
- **💰 Cost (Optimization):** Dynamically evaluates prompt complexity and suggests downgrading models (e.g., GPT-4o → GPT-4o-mini) to save tokens on simple queries.
- **🧠 Performance (Hallucinations):** Cross-references AI-generated code against the local workspace to flag hallucinated imports, fake file paths, and deprecated APIs.

All of this happens transparently through a lightweight local HTTP proxy, with an additional manual testing panel for quick, interactive scans without needing live AI traffic.

---

## 🏗️ Architecture

```
+-----------+        +------------+        +----------------------+        +----------+
| Developer | -----> | VS Code    | -----> | [ControlPlane Proxy] | -----> | AI API   |
+-----------+        +------------+        |  1. Responsibility   |        +----------+
                                           |  2. Cost Routing     |
                                           |  3. Latency Guard    |
                                           +----------------------+
                                                     |
                                            (Inbound Response)
                                                     v
                                           +----------------------+
                                           | Performance Engine   |
                                           | (Diagnostics UI)     |
                                           +----------------------+
```

**How it works, end to end:**
1. The extension spins up a local HTTP proxy on activation, listening on a random local port.
2. Outbound requests from the developer are intercepted and passed through the **Responsibility Engine** (secret detection) and **Cost Engine** (complexity/model analysis).
3. An **Action Router** decides whether to redact, reroute, or pass the request through unmodified, based on a fixed priority order: Responsibility > Performance > Cost.
4. The (possibly modified) request is forwarded to the real AI API.
5. The AI's response is intercepted on the way back and passed through the **Performance Engine**, which cross-references it against the local workspace to catch hallucinated imports, fake paths, and deprecated APIs.
6. Any issues found are surfaced as native VS Code diagnostics, status bar updates, and notifications — all within a configurable latency budget so the developer's workflow is never blocked.

---

## 📁 Project Structure

```
controlplane-vscode/
├── .vscode/                        # Debug/launch configuration for the Extension Development Host
│   ├── launch.json
│   └── tasks.json
├── out/                             # Compiled JavaScript output (generated by `npm run compile`)
│   └── ...                          # Mirrors src/ structure, do not edit directly
├── src/                             # All extension source code (TypeScript)
│   ├── actions/                     # Decision logic + response actions
│   │   ├── actionRouter.ts          # Central PASS / EDIT / ESCALATE decision logic
│   │   ├── escalationManager.ts     # Pushes hallucination findings to VS Code Diagnostics
│   │   ├── modelRouter.ts           # Mutates outgoing request to swap in a cheaper model
│   │   └── redactor.ts              # Replaces detected secrets with [REDACTED:TYPE] placeholders
│   ├── engines/                     # The three core detection engines
│   │   ├── costEngine.ts            # Token counting + complexity + model downgrade suggestions
│   │   ├── performanceEngine.ts     # Hallucination / deprecated API detection
│   │   └── responsibilityEngine.ts  # Secret / PII detection
│   ├── proxy/
│   │   └── interceptManager.ts      # The local HTTP proxy that intercepts outbound/inbound traffic
│   ├── ui/                          # All VS Code UI surfaces
│   │   ├── notificationPanel.ts     # Session summary + intervention toasts
│   │   ├── scanPromptPanel.ts       # Manual "Scan Prompt" webview panel
│   │   └── statusBar.ts             # Status bar indicator (active / warning / savings)
│   ├── utils/                       # Shared helpers
│   │   ├── latencyGuard.ts          # withTimeout() wrapper enforcing the latency budget
│   │   ├── localFileIndexer.ts      # Indexes workspace files + dependencies for hallucination checks
│   │   ├── secretPatterns.ts        # Regex rule definitions for secret detection
│   │   └── tokenCounter.ts          # tiktoken-based token counting
│   └── extension.ts                 # Extension entry point — activation, command registration, wiring
├── testcases/                       # Ready-to-use manual test cases (see below)
│   ├── Test_Case.md                 # Index — outlines all test case names and purposes
│   ├── Test_Case_A1.md … A5.md      # Prompt-only test cases (Responsibility + Cost engines)
│   └── Test_Case_B1.md … B6.md      # Prompt + Mock Response test cases (adds Performance engine)
├── package.json                     # Extension manifest — commands, settings, dependencies
├── test-proxy.js                    # Script to simulate real HTTP traffic through the live proxy
├── tsconfig.json                    # TypeScript compiler configuration
├── usage.md                         # Full step-by-step usage guide
└── README.md                        # You are here
```

---

## 🔧 Implementation Approach

The prototype is a VS Code extension written entirely in TypeScript, organized into clearly separated layers so each responsibility can be reasoned about (and tested) independently.

### 1. Interception Layer — `src/proxy/interceptManager.ts`
A raw Node.js `http.Server` is started on extension activation and bound to a random local port (`127.0.0.1:0`). This proxy sits transparently between the developer's tooling and the real AI API:
- On each incoming request, the body is buffered and parsed.
- Outbound checks (Responsibility, Cost) run **before** the request is forwarded upstream.
- The request is then piped to the real API endpoint using `http.request()`, preserving headers and method.
- On the response leg, the response body is buffered, and the Performance Engine runs **after** the response is already streamed back to the client — so hallucination checking never adds latency to what the developer sees, it only adds follow-up diagnostics shortly after.

### 2. Detection Engines — `src/engines/`
Each risk dimension is implemented as an independent, stateless class with a single public method:
- `ResponsibilityEngine.scan(prompt)` — runs a list of regex-based rules (`src/utils/secretPatterns.ts`) against the prompt text and returns every match found.
- `CostEngine.analyze(prompt, model)` — computes token count (via `tiktoken`), checks for code blocks/line count, classifies complexity as LOW/MEDIUM/HIGH, and looks up whether a cheaper model exists for the current model + complexity combination.
- `PerformanceEngine.validate(responseText)` — parses AI-generated text for import statements, relative file paths, and known deprecated API patterns, cross-referencing imports/paths against a `LocalFileIndexer` that scans the actual open workspace on activation.

Because these engines take plain strings in and structured findings out, they can be invoked identically from both the live HTTP proxy path and the standalone manual testing UI — guaranteeing consistent behavior between "real" traffic and manual test scans.

### 3. Decision Logic — `src/actions/actionRouter.ts`
A single `ActionRouter.decide()` function takes the outputs of all three engines and reduces them to one of three tiers — `PASS`, `EDIT`, or `ESCALATE` — using a fixed priority order (secrets first, then hallucinations, then cost). This keeps the decision logic centralized and testable in one place, rather than scattered across the proxy code.

### 4. Response Actions — `src/actions/redactor.ts`, `src/actions/modelRouter.ts`, `src/actions/escalationManager.ts`
Once a decision is made, three small, focused modules carry it out:
- `redactPrompt()` replaces every detected secret with a typed placeholder (e.g. `[REDACTED:AWS_KEY]`).
- `routeRequest()` mutates the outgoing request body to swap in a cheaper suggested model.
- `EscalationManager` pushes hallucination findings into VS Code's native `DiagnosticCollection` API, so flagged AI output appears as familiar squiggly underlines and Problems panel entries — no custom UI needed for this part.

### 5. Latency Protection — `src/utils/latencyGuard.ts`
Every engine call inside the proxy path is wrapped in a `withTimeout()` helper that races the real check against a configurable timer (`controlplane.latencyBudgetMs`, default 50ms). If a check doesn't finish in time, it fails open with a safe default result rather than blocking the request indefinitely — directly addressing the brief's concern about latency budgets varying by use case.

### 6. Manual Testing Surface — `src/ui/scanPromptPanel.ts`
Since fully wiring up a real AI API key/backend was out of scope for a hackathon prototype, we built a **webview-based manual scan panel** (`ControlPlane: Scan Prompt`) that calls the exact same engine instances used by the live proxy, but takes input directly from two textareas (an outbound prompt and an optional mock AI response) instead of real HTTP traffic. This let us thoroughly demonstrate and test all three engines — including the inbound hallucination path — without depending on a live model connection during development and demoing.

### 7. UI Feedback — `src/ui/statusBar.ts`, `src/ui/notificationPanel.ts`
A persistent status bar item reflects the extension's live state (active, warning, or a running tally of tokens saved), and an output channel plus lightweight notifications give visibility into what the proxy is doing in the background, without requiring the developer to open any dedicated panel during normal use.

---

## ✨ Key Features

- Real-time secret/API-key/PII detection and redaction on outbound prompts
- Automatic model downgrade suggestions based on prompt complexity (with estimated savings)
- Hallucination detection for fake imports, fake file paths, and deprecated API usage in AI responses
- Native VS Code diagnostics integration (squiggly underlines + Problems panel) for flagged AI output
- A standalone **Manual Scan Panel** (`ControlPlane: Scan Prompt`) for quick, interactive testing without needing live AI traffic — supports both prompt-only and prompt+response testing
- A session dashboard summarizing secrets redacted, tokens saved, and hallucinations flagged
- Configurable per-engine toggles and a latency budget to keep checks fast and non-blocking

---

## 🛠️ Tech Stack

- **TypeScript** — core extension logic
- **VS Code Extension API** — commands, webviews, diagnostics, status bar, output channels
- **Node.js `http` module** — the local intercepting proxy server
- **tiktoken** — accurate token counting for cost analysis
- **HTML/CSS/JS (Webview)** — the interactive Manual Scan Panel UI

---

## 🚀 Quick Start

### Prerequisites
- VS Code `^1.80.0`
- Node.js installed

### Installation

```bash
git clone <this-repo-url>
cd controlplane-vscode
npm install
npm run compile
```

Then press **F5** in VS Code to launch the Extension Development Host.

### Running it

You have two ways to test ControlPlane VSCode, both detailed fully in [`usage.md`](./usage.md):

1. **HTTP Proxy Simulation** — run `node test-proxy.js <PORT>` (port shown in the ControlPlane output channel) to simulate real AI API traffic through the actual proxy.
2. **Manual Scan Panel** — open the Command Palette and run `ControlPlane: Scan Prompt` for an interactive, no-terminal-needed testing experience.

For a full library of ready-to-use test inputs (secrets, cost scenarios, hallucination examples), see the [`testcases/`](./testcases/) folder — start with [`Test_Case.md`](./testcases/Test_Case.md) for the index of all 11 cases.

---

## 🔗 Links

- 📖 Full usage guide: [`usage.md`](./usage.md)
- 🧪 Test case index: [`testcases/Test_Case.md`](./testcases/Test_Case.md)
- 🧪 Individual test cases: [`testcases/`](./testcases/) (`Test_Case_A1.md` – `Test_Case_A5.md` for prompt-only, `Test_Case_B1.md` – `Test_Case_B6.md` for prompt + mock response)
- 🎥 Demo video: *(coming soon)*

---

## 🧗 Challenges We Faced

One of the biggest technical hurdles was moving our initial groundwork — originally scaffolded and explored inside Antigravity — into a fully functional, native VS Code extension. This meant getting hands-on with the real VS Code Extension API: webviews, diagnostic collections, output channels, and status bar items, and making sure they all worked together reliably.

A specific bug that stood out: we discovered that `vscode.window.activeTextEditor` becomes `undefined` the moment our webview panel gains focus — which silently broke our "Send to Diagnostics" feature, since clicking a button inside the webview meant VS Code no longer considered any text editor "active." We solved this by tracking the last known active editor through an `onDidChangeActiveTextEditor` listener and referencing that cached editor instead of relying on the live value at click-time.

---

## 📚 What We Learned

Building this project pushed us to understand VS Code's extension architecture at a much deeper level than we expected going in — particularly the nuances of webview-to-extension messaging, how focus and activation events actually behave under the hood, and how to design a diagnostics pipeline that feels native to the editor rather than bolted on.

We also came away with a much clearer picture of how prompt complexity, token economics, and secret leakage all intersect as real, everyday developer pain points — and how a relatively small, well-scoped tool can meaningfully address all three at once.

---

## 🔮 What's Next

Given more time beyond the hackathon scope, we'd want to extend ControlPlane VSCode along the lines the problem brief itself calls out:

- **Feedback loops** — capturing when a developer overrides or dismisses a flagged finding, and feeding that back to tune detection sensitivity over time
- **Confidence scoring** — moving beyond binary rule matches toward weighted confidence scores per finding, enabling finer-grained tiering than our current PASS/EDIT/ESCALATE model
- **AI-as-judge verification** — using a lightweight secondary model to sanity-check ambiguous hallucination cases where static analysis alone isn't conclusive
- **Metrics & monitoring dashboard** — a proper false-positive/false-negative tracking view, not just raw counts, to report system trustworthiness to a skeptical stakeholder
- **Multi-use-case policy profiles** — letting the same engine set behave differently for a customer-facing chatbot vs. an internal developer copilot, as the brief's real-world context describes

---

## 👥 Team — 3rd_Floor

This project was built by **Team 3rd_Floor** for the Accenture Innovation Challenge - 2026:

- **Avanish Pandey**
- **Ashish Kumar Yadav**
- **Dhananjit Das**

Thank you for checking out ControlPlane VSCode! 🛡️