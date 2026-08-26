import * as vscode from 'vscode';

export interface SessionStats {
    secretsRedacted: number;
    tokensSaved: number;
    hallucinationsFlagged: number;
    totalRequests: number;
}

export class NotificationPanel {
    constructor(private outputChannel: vscode.OutputChannel) {}

    public async showSummary(stats: SessionStats): Promise<void> {
        const msg = `ControlPlane Session: ${stats.secretsRedacted} redacted, ${stats.tokensSaved} tokens saved, ${stats.hallucinationsFlagged} flagged in ${stats.totalRequests} requests.`;
        
        const selection = await vscode.window.showInformationMessage(msg, "View Log", "Dismiss");
        
        if (selection === "View Log") {
            this.outputChannel.show();
        }
    }

    public showIntervention(type: string, detail: string): void {
        vscode.window.showInformationMessage(`$(shield) ControlPlane: ${type} — ${detail}`);
    }
}
