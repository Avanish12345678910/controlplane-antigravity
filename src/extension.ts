import { ScanPromptPanel } from './ui/scanPromptPanel';
import * as vscode from 'vscode';
import { InterceptManager, InterceptOptions } from './proxy/interceptManager';
import { ResponsibilityEngine } from './engines/responsibilityEngine';
import { CostEngine } from './engines/costEngine';
import { PerformanceEngine } from './engines/performanceEngine';
import { LocalFileIndexer } from './utils/localFileIndexer';
import { ActionRouter } from './actions/actionRouter';
import { StatusBarManager } from './ui/statusBar';
import { NotificationPanel } from './ui/notificationPanel';
import { EscalationManager } from './actions/escalationManager';

let interceptManager: InterceptManager;
let notificationPanel: NotificationPanel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("ControlPlane");
    context.subscriptions.push(outputChannel);

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const statusBarManager = new StatusBarManager(statusBarItem);
    notificationPanel = new NotificationPanel(outputChannel);
    const actionRouter = new ActionRouter();

    const responsibilityEngine = new ResponsibilityEngine();
    const costEngine = new CostEngine();

    const localFileIndexer = new LocalFileIndexer();
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        localFileIndexer.buildIndex(workspaceFolders[0].uri.fsPath);
    }
    const performanceEngine = new PerformanceEngine(localFileIndexer);
    const escalationManager = new EscalationManager();

    const options: InterceptOptions = {
        responsibilityEngine, costEngine, performanceEngine,
        actionRouter, statusBarManager, notificationPanel, escalationManager
    };

    interceptManager = new InterceptManager(outputChannel, options);
    interceptManager.start();

    // --- Track last active text editor ---
    // Needed because vscode.window.activeTextEditor becomes undefined
    // the moment a webview panel (like ScanPromptPanel) gains focus.
    // We cache the last known text editor so webview button clicks can
    // still target the correct document (e.g. for diagnostics).
    let lastActiveEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                lastActiveEditor = editor;
            }
            // if editor is undefined (e.g. webview focused), keep the last known one
        })
    );

    // Mapping to the command defined in package.json from Phase 1
    const summaryCmd = vscode.commands.registerCommand('controlplane.showDashboard', () => {
        notificationPanel.showSummary(interceptManager.getStats());
    });
    context.subscriptions.push(summaryCmd);

    const scanPromptCmd = vscode.commands.registerCommand('controlplane.scanPrompt', () => {
        ScanPromptPanel.createOrShow({
            responsibilityEngine,
            costEngine,
            performanceEngine,
            actionRouter,
            escalationManager,
            outputChannel,
            getActiveEditor: () => lastActiveEditor
        });
    });
    context.subscriptions.push(scanPromptCmd);

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('controlplane')) {
            outputChannel.appendLine("ControlPlane settings reloaded.");
        }
    }));

    context.subscriptions.push({
        dispose: () => {
            interceptManager.stop();
            statusBarManager.dispose();
            localFileIndexer.dispose();
            escalationManager.dispose();
        }
    });
}

export function deactivate() {
    if (notificationPanel && interceptManager) {
        notificationPanel.showSummary(interceptManager.getStats());
    }
    if (interceptManager) interceptManager.stop();
    if (statusBarItem) statusBarItem.dispose();
}