import * as vscode from 'vscode';

export class StatusBarManager {
    private item: vscode.StatusBarItem;
    private timerId: NodeJS.Timeout | null = null;
    private savedTokens: number = 0;
    private baseText: string = "$(shield) ControlPlane: Active";

    constructor(item: vscode.StatusBarItem) {
        this.item = item;
        this.setHealthy();
    }

    public setHealthy() {
        this.baseText = "$(shield) ControlPlane: Active";
        this.updateItem(new vscode.ThemeColor('testing.iconPassed'));
    }

    public setWarning(msg: string) {
        this.baseText = `$(shield) ControlPlane | ⚠ ${msg}`;
        this.updateItem(new vscode.ThemeColor('list.warningForeground'));
    }

    public setSavings(tokens: number) {
        this.savedTokens = tokens;
        this.updateItem();
    }

    public flashRedacted(count: number) {
        if (this.timerId) clearTimeout(this.timerId);
        
        this.item.text = `$(shield) Redacted ${count} secret(s)`;
        this.item.color = new vscode.ThemeColor('errorForeground');
        
        this.timerId = setTimeout(() => {
            this.timerId = null;
            this.updateItem();
        }, 3000);
    }

    private updateItem(color?: vscode.ThemeColor) {
        if (!this.timerId) {
            let text = this.baseText;
            if (this.savedTokens > 0) {
                text += ` | ~${this.savedTokens} tokens saved`;
            }
            this.item.text = text;
            
            if (color) {
                this.item.color = color;
            } else if (this.baseText.includes('⚠')) {
                this.item.color = new vscode.ThemeColor('list.warningForeground');
            } else {
                this.item.color = new vscode.ThemeColor('testing.iconPassed');
            }
        }
    }

    public dispose() {
        if (this.timerId) clearTimeout(this.timerId);
    }
}
