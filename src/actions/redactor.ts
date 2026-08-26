import { Finding } from '../engines/responsibilityEngine';

export function redactPrompt(prompt: string, findings: Finding[]): string {
    let sanitized = prompt;
    for (const finding of findings) {
        const redactedTag = `[REDACTED:${finding.placeholder}]`;
        sanitized = sanitized.split(finding.match).join(redactedTag);
    }
    return sanitized;
}
