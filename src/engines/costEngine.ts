import * as vscode from 'vscode';
import { TokenCounter } from '../utils/tokenCounter';

export interface CostAnalysis {
    tokenCount: number;
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedModel: string | null;
    estimatedSavingsPercent: number;
}

export class CostEngine {
    private counter = new TokenCounter();

    public analyze(prompt: string, model: string): CostAnalysis {
        const tokenCount = this.counter.count(prompt);
        const lines = prompt.split('\n').length;
        const hasCodeBlocks = prompt.includes('```') || /^\s{4}/m.test(prompt);
        
        let complexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
        
        if (tokenCount < 80 && lines <= 2 && !hasCodeBlocks) {
            complexity = 'LOW';
        } else if (tokenCount > 500 || hasCodeBlocks) {
            complexity = 'HIGH';
        }

        let suggestedModel: string | null = null;
        let estimatedSavingsPercent = 0;

        const config = vscode.workspace.getConfiguration('controlplane.cost');
        const mapping = config.get<Record<string, string>>('modelMapping');

        if (mapping && mapping[model]) {
            suggestedModel = mapping[model];
            estimatedSavingsPercent = 50; // default estimated savings for manual overrides
        } else if (complexity === 'LOW') {
            if (model === 'gpt-4o') {
                suggestedModel = 'gpt-4o-mini';
                estimatedSavingsPercent = 90;
            } else if (model === 'claude-sonnet-4-20250514') {
                suggestedModel = 'claude-haiku';
                estimatedSavingsPercent = 80;
            }
        }

        return { tokenCount, complexity, suggestedModel, estimatedSavingsPercent };
    }
}
