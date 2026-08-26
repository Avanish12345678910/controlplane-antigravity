import * as vscode from 'vscode';

export async function withTimeout<T>(
    fn: () => Promise<T>, 
    ms: number, 
    fallback: T,
    out?: vscode.OutputChannel,
    label = 'Operation'
): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
            if (out) out.appendLine(`[LatencyGuard] ⚠ ${label} exceeded ${ms}ms timeout — returning fallback.`);
            resolve(fallback);
        }, ms);
    });

    try {
        const result = await Promise.race([fn(), timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (err) {
        clearTimeout(timeoutId!);
        if (out) out.appendLine(`[LatencyGuard] ⚠ ${label} failed: ${err}`);
        return fallback;
    }
}

export function measureSync<T>(
    label: string, 
    fn: () => T, 
    out?: vscode.OutputChannel
): T {
    const budgetMs = vscode.workspace.getConfiguration('controlplane').get<number>('latencyBudgetMs', 50);
    const start = process.hrtime.bigint();
    
    try {
        const result = fn();
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        
        if (durationMs > budgetMs && out) {
            out.appendLine(`[LatencyGuard] ⚠ ${label} took ${durationMs.toFixed(2)}ms (budget: ${budgetMs}ms).`);
        }
        return result;
    } catch (e) {
        if (out) out.appendLine(`[LatencyGuard] ⚠ ${label} error: ${e}`);
        throw e;
    }
}
