import * as vscode from 'vscode';
import { HallucinationFinding } from '../engines/performanceEngine';

export class EscalationManager {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection("controlplane");
    }

    public escalate(findings: HallucinationFinding[], documentUri: vscode.Uri): void {
        const diagnostics: vscode.Diagnostic[] = [];

        for (const finding of findings) {
            const lineIndex = Math.max(0, finding.line - 1);
            const range = new vscode.Range(lineIndex, 0, lineIndex, 100);
            
            const severity = finding.type === 'deprecated_api' 
                ? vscode.DiagnosticSeverity.Information 
                : vscode.DiagnosticSeverity.Warning;

            const diagnostic = new vscode.Diagnostic(range, `ControlPlane: ${finding.message}`, severity);
            diagnostics.push(diagnostic);
        }

        this.diagnosticCollection.set(documentUri, diagnostics);
        vscode.window.showWarningMessage(`$(warning) ControlPlane: ${findings.length} potential issue(s) in AI output. Check diagnostics.`);
    }

    public clear(): void {
        this.diagnosticCollection.clear();
    }
    
    public dispose() {
        this.diagnosticCollection.dispose();
    }
}
