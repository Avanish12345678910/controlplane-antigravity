import { secretPatterns, SecretRule } from '../utils/secretPatterns';

export interface Finding {
    ruleId: string;
    name: string;
    match: string;
    placeholder: string;
}

export class ResponsibilityEngine {
    private rules: SecretRule[] = secretPatterns;

    public scan(prompt: string): { hasLeak: boolean; findings: Finding[] } {
        if (!prompt || prompt.length === 0) {
            return { hasLeak: false, findings: [] };
        }

        const findings: Finding[] = [];

        for (const rule of this.rules) {
            rule.pattern.lastIndex = 0; // Reset regex state
            let match;
            while ((match = rule.pattern.exec(prompt)) !== null) {
                findings.push({
                    ruleId: rule.id,
                    name: rule.name,
                    match: match[0],
                    placeholder: rule.placeholder
                });
            }
        }

        return {
            hasLeak: findings.length > 0,
            findings
        };
    }
}
