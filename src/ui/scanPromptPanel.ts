import * as vscode from 'vscode';
import { ResponsibilityEngine, Finding } from '../engines/responsibilityEngine';
import { CostEngine, CostAnalysis } from '../engines/costEngine';
import { PerformanceEngine, HallucinationFinding } from '../engines/performanceEngine';
import { ActionRouter } from '../actions/actionRouter';
import { EscalationManager } from '../actions/escalationManager';
import { redactPrompt } from '../actions/redactor';

export interface ScanPromptDeps {
    responsibilityEngine: ResponsibilityEngine;
    costEngine: CostEngine;
    performanceEngine: PerformanceEngine;
    actionRouter: ActionRouter;
    escalationManager: EscalationManager;
    outputChannel: vscode.OutputChannel;
    getActiveEditor: () => vscode.TextEditor | undefined;
}

const MODEL_OPTIONS = ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude-haiku', 'gpt-4', 'gpt-3.5-turbo'];

export class ScanPromptPanel {
    public static currentPanel: ScanPromptPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private scanCount = 0;

    public static createOrShow(deps: ScanPromptDeps) {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

        if (ScanPromptPanel.currentPanel) {
            ScanPromptPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'controlplaneScanPrompt',
            'ControlPlane: Scan Prompt',
            column,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        ScanPromptPanel.currentPanel = new ScanPromptPanel(panel, deps);
    }

    private constructor(panel: vscode.WebviewPanel, private deps: ScanPromptDeps) {
        this.panel = panel;
        this.panel.webview.html = this.getHtml();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case 'runScan':
                    await this.handleScan(msg.prompt, msg.mockResponse, msg.model, msg.verbose);
                    break;
                case 'applyRedaction':
                    this.applyRedaction(msg.prompt, msg.findings, msg.verbose);
                    break;
                case 'applyModel':
                    this.applyModel(msg.model, msg.verbose);
                    break;
                case 'showDiagnostics':
                    this.showDiagnostics(msg.findings, msg.verbose);
                    break;
                case 'clearDiagnostics':
                    this.clearDiagnostics(msg.verbose);
                    break;
            }
        }, null, this.disposables);
    }

    private log(verbose: boolean, line: string) {
        // Only writes to the output channel when the user has "Verbose Logging" enabled.
        // Keeps the shared ControlPlane output channel clean during normal manual testing.
        if (verbose) {
            this.deps.outputChannel.appendLine(line);
        }
    }

    private async handleScan(prompt: string, mockResponse: string, model: string, verbose: boolean) {
        const { responsibilityEngine, costEngine, performanceEngine, actionRouter } = this.deps;

        this.scanCount++;
        this.log(verbose, `\n──────── [ScanPrompt #${this.scanCount}] ${new Date().toLocaleTimeString()} ────────`);

        const respScan = prompt
            ? responsibilityEngine.scan(prompt)
            : { hasLeak: false, findings: [] as Finding[] };

        const costAnalysis: CostAnalysis = prompt
            ? costEngine.analyze(prompt, model)
            : { tokenCount: 0, complexity: 'LOW', suggestedModel: null, estimatedSavingsPercent: 0 };

        const perfReport = mockResponse
            ? performanceEngine.validate(mockResponse)
            : { hasIssues: false, findings: [] as HallucinationFinding[] };

        const outboundDecision = actionRouter.decide(respScan, costAnalysis, { hasIssues: false });
        const inboundDecision = actionRouter.decide({ hasLeak: false }, { suggestedModel: null }, perfReport);

        this.log(verbose, `[ScanPrompt] Outbound → ${outboundDecision.action} (${outboundDecision.reason})`);
        this.log(verbose, `[ScanPrompt] Inbound  → ${inboundDecision.action} (${inboundDecision.reason})`);

        const activeDocOpen = !!this.deps.getActiveEditor();
        if (mockResponse && !activeDocOpen) {
            vscode.window.showWarningMessage('ControlPlane: Open a file in the editor to enable "Send to Diagnostics" for hallucination findings.');
        }

        this.panel.webview.postMessage({
            command: 'scanResult',
            respScan,
            costAnalysis,
            perfReport,
            outboundDecision,
            inboundDecision,
            originalPrompt: prompt,
            originalModel: model,
            activeDocOpen
        });
    }

    private applyRedaction(prompt: string, findings: Finding[], verbose: boolean) {
        const sanitized = redactPrompt(prompt, findings);
        this.log(verbose, `[ScanPrompt] User applied redaction — ${findings.length} secret(s) removed.`);
        this.panel.webview.postMessage({ command: 'redactionApplied', sanitized });
    }

    private applyModel(model: string, verbose: boolean) {
        this.log(verbose, `[ScanPrompt] User accepted suggested model → ${model}`);
        vscode.window.showInformationMessage(`ControlPlane: Model set to "${model}" (test only — nothing was actually routed).`);
    }

    private showDiagnostics(findings: HallucinationFinding[], verbose: boolean) {
        const activeEditor = this.deps.getActiveEditor();
        if (!activeEditor) {
            vscode.window.showWarningMessage('ControlPlane: Please open a file in the editor first.');
            return;
        }
        this.log(verbose, `[ScanPrompt] Sent ${findings.length} finding(s) to diagnostics for ${activeEditor.document.uri.fsPath}`);
        this.deps.escalationManager.escalate(findings, activeEditor.document.uri);
    }

    private clearDiagnostics(verbose: boolean) {
        this.deps.escalationManager.clear();
        this.log(verbose, `[ScanPrompt] Cleared all ControlPlane diagnostics.`);
        vscode.window.showInformationMessage('ControlPlane: Diagnostics cleared.');
    }

    private getHtml(): string {
        const modelOptionsHtml = MODEL_OPTIONS.map(m => `<option value="${m}">${m}</option>`).join('');

        return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
  }
  h2 { margin-bottom: 4px; }
  .subtitle { opacity: 0.7; margin-bottom: 16px; font-size: 12px; }
  label { display: block; margin: 10px 0 4px; font-weight: 600; font-size: 12px; }
  select, textarea {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #444);
    border-radius: 4px;
    padding: 8px;
    font-family: var(--vscode-editor-font-family);
    box-sizing: border-box;
  }
  textarea { min-height: 100px; resize: vertical; }
  button {
    margin-top: 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    margin-left: 8px;
  }
  button.danger {
    background: transparent;
    color: var(--vscode-errorForeground, #f85149);
    border: 1px solid var(--vscode-errorForeground, #f85149);
    margin-left: 8px;
  }
  .section {
    margin-top: 20px;
    padding: 12px;
    border: 1px solid var(--vscode-widget-border, #444);
    border-radius: 6px;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    margin-left: 8px;
  }
  .badge.PASS { background: #2ea04326; color: #2ea043; }
  .badge.EDIT { background: #d2992226; color: #d29922; }
  .badge.ESCALATE { background: #f8514926; color: #f85149; }
  .finding {
    padding: 6px 8px;
    margin: 6px 0;
    background: var(--vscode-textBlockQuote-background);
    border-left: 3px solid var(--vscode-textLink-foreground);
    font-size: 12px;
  }
  #results { display: none; }
  textarea[readonly] { opacity: 0.85; }
  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    opacity: 0.85;
  }
  .checkbox-row input { margin: 0; }
</style>
</head>
<body>
  <h2>🛡️ ControlPlane — Manual Prompt Scanner</h2>
  <div class="subtitle">Isolated test tool — does not affect live proxy stats or dashboard.</div>

  <label>Model</label>
  <select id="modelSelect">${modelOptionsHtml}</select>

  <label>Outbound Prompt (what a developer would send to the AI)</label>
  <textarea id="promptInput" placeholder="e.g. Here is my AWS key AKIA... please help me deploy"></textarea>

  <label>Mock AI Response (optional — for hallucination / performance testing)</label>
  <textarea id="responseInput" placeholder="Paste a fake AI-generated code response here to test PerformanceEngine"></textarea>

  <div class="toolbar-row">
    <button id="runScanBtn">▶ Run Scan</button>
    <button id="clearDiagBtn" class="danger">🧹 Clear Diagnostics</button>
    <div class="checkbox-row">
      <input type="checkbox" id="verboseToggle" />
      <label for="verboseToggle" style="margin:0; font-weight:400;">Verbose logging (ControlPlane output channel)</label>
    </div>
  </div>

  <div id="results"></div>

<script>
  const vscode = acquireVsCodeApi();
  let currentPrompt = '';
  let currentFindings = [];
  let currentPerfFindings = [];

  function isVerbose() {
    return document.getElementById('verboseToggle').checked;
  }

  document.getElementById('runScanBtn').addEventListener('click', () => {
    const prompt = document.getElementById('promptInput').value;
    const mockResponse = document.getElementById('responseInput').value;
    const model = document.getElementById('modelSelect').value;
    currentPrompt = prompt;
    vscode.postMessage({ command: 'runScan', prompt, mockResponse, model, verbose: isVerbose() });
  });

  document.getElementById('clearDiagBtn').addEventListener('click', () => {
    vscode.postMessage({ command: 'clearDiagnostics', verbose: isVerbose() });
  });

  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.command === 'scanResult') renderResults(msg);
    if (msg.command === 'redactionApplied') {
      const el = document.getElementById('redactedOutput');
      if (el) { el.style.display = 'block'; el.value = msg.sanitized; }
    }
  });

  function badge(action) {
    return '<span class="badge ' + action + '">' + action + '</span>';
  }

  function renderResults(data) {
    currentFindings = data.respScan.findings || [];
    currentPerfFindings = data.perfReport.findings || [];

    let html = '';

    // --- Responsibility ---
    html += '<div class="section"><strong>🔐 Responsibility (Data Leaks)</strong>' + badge(data.outboundDecision.priority === 'responsibility' ? data.outboundDecision.action : (data.respScan.hasLeak ? 'EDIT' : 'PASS'));
    if (data.respScan.hasLeak) {
      html += data.respScan.findings.map(f =>
        '<div class="finding">⚠ <strong>' + f.name + '</strong> (' + f.ruleId + ') — will become <code>[REDACTED:' + f.placeholder + ']</code></div>'
      ).join('');
      html += '<button onclick="applyRedaction()">✅ Apply Redaction</button>';
      html += '<button class="secondary" onclick="ignore(\\'responsibility\\')">Ignore / Keep as-is</button>';
      html += '<textarea id="redactedOutput" readonly style="display:none; margin-top:10px;"></textarea>';
    } else {
      html += '<div class="finding">No secrets detected.</div>';
    }
    html += '</div>';

    // --- Cost ---
    html += '<div class="section"><strong>💰 Cost Optimization</strong>' + badge(data.costAnalysis.suggestedModel ? 'EDIT' : 'PASS');
    html += '<div class="finding">Tokens: ' + data.costAnalysis.tokenCount + ' | Complexity: ' + data.costAnalysis.complexity + '</div>';
    if (data.costAnalysis.suggestedModel) {
      html += '<div class="finding">Suggestion: switch <strong>' + data.originalModel + '</strong> → <strong>' + data.costAnalysis.suggestedModel + '</strong> (~' + data.costAnalysis.estimatedSavingsPercent + '% savings)</div>';
      html += '<button onclick="applyModel(\\'' + data.costAnalysis.suggestedModel + '\\')">✅ Use ' + data.costAnalysis.suggestedModel + '</button>';
      html += '<button class="secondary" onclick="applyModel(\\'' + data.originalModel + '\\')">Keep ' + data.originalModel + '</button>';
    } else {
      html += '<div class="finding">No cheaper model suggested for this prompt/model combo.</div>';
    }
    html += '</div>';

    // --- Performance ---
    html += '<div class="section"><strong>🧠 Performance (Hallucinations)</strong>' + badge(data.perfReport.hasIssues ? 'ESCALATE' : 'PASS');
    if (data.perfReport.hasIssues) {
      html += data.perfReport.findings.map(f =>
        '<div class="finding">[' + f.severity.toUpperCase() + '] Line ' + f.line + ' — ' + f.message + ' (<code>' + f.matchedText + '</code>)</div>'
      ).join('');
      html += '<button onclick="showDiagnostics()" ' + (data.activeDocOpen ? '' : 'disabled title="Open a file first"') + '>📍 Send to Diagnostics</button>';
      if (!data.activeDocOpen) html += '<div class="finding">⚠ Open a file in the editor to enable diagnostics.</div>';
    } else if (data.perfReport && document.getElementById('responseInput').value) {
      html += '<div class="finding">No hallucinations detected in mock response.</div>';
    } else {
      html += '<div class="finding">No mock AI response provided — skipped.</div>';
    }
    html += '</div>';

    document.getElementById('results').innerHTML = html;
    document.getElementById('results').style.display = 'block';
  }

  function applyRedaction() {
    vscode.postMessage({ command: 'applyRedaction', prompt: currentPrompt, findings: currentFindings, verbose: isVerbose() });
  }
  function applyModel(model) {
    vscode.postMessage({ command: 'applyModel', model, verbose: isVerbose() });
  }
  function showDiagnostics() {
    vscode.postMessage({ command: 'showDiagnostics', findings: currentPerfFindings, verbose: isVerbose() });
  }
  function ignore(kind) {
    vscode.postMessage({ command: 'ignored', kind, verbose: isVerbose() });
  }
</script>
</body>
</html>`;
    }

    public dispose() {
        ScanPromptPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) d.dispose();
        }
    }
}