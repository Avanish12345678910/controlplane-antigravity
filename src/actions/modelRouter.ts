import * as vscode from 'vscode';
import { CostAnalysis } from '../engines/costEngine';

export function routeRequest(reqBody: any, analysis: CostAnalysis, outputChannel: vscode.OutputChannel): any {
    if (analysis.suggestedModel && reqBody.model) {
        const originalModel = reqBody.model;
        reqBody.model = analysis.suggestedModel;
        outputChannel.appendLine(`$(zap) ControlPlane: Routed ${originalModel} → ${analysis.suggestedModel} (saved ~${analysis.estimatedSavingsPercent}%).`);
    }
    return reqBody;
}
