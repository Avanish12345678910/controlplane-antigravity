export type ActionType = 'PASS' | 'EDIT' | 'ESCALATE';

export interface ActionDecision {
    action: ActionType;
    reason: string;
    priority: 'responsibility' | 'cost' | 'performance' | 'none';
}

export class ActionRouter {
    public decide(
        responsibilityResult: { hasLeak: boolean },
        costAnalysis: { suggestedModel: string | null },
        performanceReport: { hasIssues: boolean }
    ): ActionDecision {
        if (responsibilityResult.hasLeak) {
            return { action: 'EDIT', reason: 'Secrets detected', priority: 'responsibility' };
        }
        if (performanceReport.hasIssues) {
            return { action: 'ESCALATE', reason: 'Hallucinations or issues detected', priority: 'performance' };
        }
        if (costAnalysis.suggestedModel) {
            return { action: 'EDIT', reason: `Routing to cheaper model: ${costAnalysis.suggestedModel}`, priority: 'cost' };
        }
        return { action: 'PASS', reason: 'All checks passed', priority: 'none' };
    }
}
