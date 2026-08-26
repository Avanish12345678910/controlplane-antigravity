import * as http from 'http';
import * as vscode from 'vscode';
import { URL } from 'url';
import { ResponsibilityEngine } from '../engines/responsibilityEngine';
import { redactPrompt } from '../actions/redactor';
import { CostEngine } from '../engines/costEngine';
import { routeRequest } from '../actions/modelRouter';
import { PerformanceEngine } from '../engines/performanceEngine';
import { EscalationManager } from '../actions/escalationManager';
import { ActionRouter } from '../actions/actionRouter';
import { StatusBarManager } from '../ui/statusBar';
import { NotificationPanel, SessionStats } from '../ui/notificationPanel';
import { withTimeout } from '../utils/latencyGuard';

export interface InterceptOptions {
    responsibilityEngine: ResponsibilityEngine;
    costEngine: CostEngine;
    performanceEngine: PerformanceEngine;
    actionRouter: ActionRouter;
    statusBarManager: StatusBarManager;
    notificationPanel: NotificationPanel;
    escalationManager: EscalationManager;
}

export class InterceptManager {
    private server: http.Server | null = null;
    private stats: SessionStats = { secretsRedacted: 0, tokensSaved: 0, hallucinationsFlagged: 0, totalRequests: 0 };

    constructor(private outputChannel: vscode.OutputChannel, private options: InterceptOptions) {}

    public getStats(): SessionStats { return this.stats; }

    public start(): void {
        try {
            this.server = http.createServer((req, res) => {
                this.stats.totalRequests++;
                this.outputChannel.appendLine(`[Request] ${req.method} ${req.url}`);

                try {
                    const urlStr = req.url?.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`;
                    const parsedUrl = new URL(urlStr || '');

                    const reqOpts: http.RequestOptions = {
                        hostname: parsedUrl.hostname, port: parsedUrl.port || 80,
                        path: parsedUrl.pathname + parsedUrl.search, method: req.method, headers: req.headers,
                    };

                    let bodyBuffer: Buffer[] = [];
                    req.on('data', chunk => bodyBuffer.push(chunk));
                    req.on('end', async () => {
                        let body = Buffer.concat(bodyBuffer);

                        try {
                            if (body.length > 0) {
                                let bodyStr = body.toString('utf8');
                                
                                const respScan = await withTimeout(() => Promise.resolve(this.options.responsibilityEngine.scan(bodyStr)), 50, { hasLeak: false, findings: [] }, this.outputChannel, 'ResponsibilityEngine');
                                
                                let costAnalysis = { suggestedModel: null as string | null, tokenCount: 0, complexity: 'LOW' as any, estimatedSavingsPercent: 0 };
                                let bodyJson: any = null;
                                let promptText = '';
                                
                                try {
                                    bodyJson = JSON.parse(bodyStr);
                                    if (bodyJson?.model) {
                                        promptText = typeof bodyJson.prompt === 'string' ? bodyJson.prompt : (Array.isArray(bodyJson.messages) ? bodyJson.messages.map((m: any) => m.content).join('\n') : '');
                                        if (promptText) {
                                            costAnalysis = await withTimeout(() => Promise.resolve(this.options.costEngine.analyze(promptText, bodyJson.model)), 50, costAnalysis, this.outputChannel, 'CostEngine');
                                        }
                                    }
                                } catch {}

                                const decision = this.options.actionRouter.decide(respScan, costAnalysis, { hasIssues: false });

                                if (decision.action === 'EDIT' && decision.priority === 'responsibility') {
                                    bodyStr = redactPrompt(bodyStr, respScan.findings);
                                    this.stats.secretsRedacted += respScan.findings.length;
                                    this.options.notificationPanel.showIntervention('Redaction', `Redacted ${respScan.findings.length} secret(s)`);
                                    this.options.statusBarManager.flashRedacted(respScan.findings.length);
                                } else if (decision.action === 'EDIT' && decision.priority === 'cost' && bodyJson) {
                                    routeRequest(bodyJson, costAnalysis, this.outputChannel);
                                    bodyStr = JSON.stringify(bodyJson);
                                    const saved = Math.floor(costAnalysis.tokenCount * (costAnalysis.estimatedSavingsPercent / 100));
                                    this.stats.tokensSaved += saved;
                                    this.options.statusBarManager.setSavings(this.stats.tokensSaved);
                                    this.options.notificationPanel.showIntervention('Cost Optimization', `Routed to ${costAnalysis.suggestedModel}`);
                                }

                                body = Buffer.from(bodyStr, 'utf8');
                                if (reqOpts.headers) {
                                    const hdrs = reqOpts.headers as Record<string, string | string[] | number | undefined>;
                                    for (const key of Object.keys(hdrs)) {
                                        if (key.toLowerCase() === 'content-length') hdrs[key] = body.length.toString();
                                    }
                                }
                            }
                        } catch (e) {
                            this.outputChannel.appendLine(`[Pipeline Error] Outbound failed: ${e}`);
                        }

                        const proxyReq = http.request(reqOpts, (proxyRes) => {
                            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
                            proxyRes.pipe(res, { end: true });

                            let respBuffer: Buffer[] = [];
                            proxyRes.on('data', chunk => respBuffer.push(chunk));
                            proxyRes.on('end', async () => {
                                try {
                                    const respStr = Buffer.concat(respBuffer).toString('utf8');
                                    let genText = '';
                                    try {
                                        const json = JSON.parse(respStr);
                                        genText = json.choices?.[0]?.message?.content || json.content?.[0]?.text || '';
                                    } catch {
                                        const contentMatches = [...respStr.matchAll(/"content":\s*"([^"]+)"/g)];
                                        genText = contentMatches.length > 0 ? contentMatches.map(m => m[1]).join('') : [...respStr.matchAll(/"text":\s*"([^"]+)"/g)].map(m => m[1]).join('');
                                        if (genText) { try { genText = JSON.parse(`"${genText}"`); } catch {} }
                                    }

                                    if (genText) {
                                        const report = await withTimeout(() => Promise.resolve(this.options.performanceEngine.validate(genText)), 50, { hasIssues: false, findings: [] }, this.outputChannel, 'PerformanceEngine');
                                        
                                        const decision = this.options.actionRouter.decide({ hasLeak: false }, { suggestedModel: null }, report);
                                        if (decision.action === 'ESCALATE' && report.hasIssues) {
                                            this.stats.hallucinationsFlagged += report.findings.length;
                                            const activeDoc = vscode.window.activeTextEditor?.document;
                                            if (activeDoc) this.options.escalationManager.escalate(report.findings, activeDoc.uri);
                                            this.options.statusBarManager.setWarning(`${report.findings.length} issue(s)`);
                                            
                                            // Revert to healthy after 3s
                                            setTimeout(() => this.options.statusBarManager.setHealthy(), 3000);
                                        }
                                    }
                                } catch {}
                            });
                        });

                        proxyReq.on('error', err => {
                            if (!res.headersSent) { res.writeHead(502); res.end(); }
                        });
                        proxyReq.write(body);
                        proxyReq.end();
                    });
                } catch (e) {
                    res.writeHead(400); res.end();
                }
            });
            this.server.listen(0, '127.0.0.1', () => {
                const addr = this.server?.address();
                if (addr && typeof addr !== 'string') {
                    this.outputChannel.appendLine(`[ControlPlane] Proxy started on http://127.0.0.1:${addr.port}`);
                    this.outputChannel.show(true); // Show output channel so user can see the port
                }
            });
        } catch {}
    }
    public stop(): void { if (this.server) this.server.close(); }
}
