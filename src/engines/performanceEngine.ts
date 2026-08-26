import { LocalFileIndexer } from '../utils/localFileIndexer';

export interface HallucinationFinding {
    type: 'hallucinated_import' | 'hallucinated_path' | 'deprecated_api';
    line: number;
    matchedText: string;
    message: string;
    severity: 'warning' | 'error';
}

export interface HallucinationReport {
    hasIssues: boolean;
    findings: HallucinationFinding[];
}

const DEPRECATED_APIS = [
    { pattern: /React\.createClass/, msg: 'React.createClass is deprecated' },
    { pattern: /url\.parse\(/, msg: 'url.parse is deprecated, use new URL()' },
    { pattern: /new Buffer\(/, msg: 'new Buffer() is deprecated, use Buffer.from() or alloc()' },
    { pattern: /tf\.compat\.v1/, msg: 'tf.compat.v1 is deprecated in TensorFlow 2.x' },
    { pattern: /ReactDOM\.render\(/, msg: 'ReactDOM.render is deprecated in React 18+' },
    { pattern: /express\.createServer/, msg: 'express.createServer is deprecated, use express()' },
    { pattern: /useNewUrlParser/, msg: 'useNewUrlParser is deprecated in Mongoose 6+' },
    { pattern: /String\.prototype\.substr/, msg: 'String.prototype.substr is deprecated' }
];

const BUILTINS = new Set(['fs', 'path', 'os', 'http', 'https', 'crypto', 'react', 'vue']);

export class PerformanceEngine {
    constructor(private indexer: LocalFileIndexer) {}

    public validate(responseText: string): HallucinationReport {
        const findings: HallucinationFinding[] = [];
        const lines = responseText.split('\n');
        
        const localPaths = this.indexer.getLocalPaths();
        const deps = this.indexer.getDependencies();

        const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
        const pathRegex = /['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;

        lines.forEach((lineText, i) => {
            const lineNum = i + 1;
            
            for (const dep of DEPRECATED_APIS) {
                if (dep.pattern.test(lineText)) {
                    findings.push({ type: 'deprecated_api', line: lineNum, matchedText: lineText.trim(), message: dep.msg, severity: 'warning' });
                }
            }

            importRegex.lastIndex = 0;
            let match;
            while ((match = importRegex.exec(lineText)) !== null) {
                const mod = match[1] || match[2];
                if (!mod) continue;
                
                if (mod.startsWith('.') || mod.startsWith('/')) {
                    const cleanPath = mod.replace(/^\.\//, '').replace(/\.[^/.]+$/, "");
                    if (!this.pathExistsRoughly(cleanPath, localPaths)) {
                        findings.push({ type: 'hallucinated_import', line: lineNum, matchedText: mod, message: `Local file ${mod} not found in workspace`, severity: 'warning' });
                    }
                } else {
                    const basePkg = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
                    if (!BUILTINS.has(basePkg) && !deps.has(basePkg)) {
                        findings.push({ type: 'hallucinated_import', line: lineNum, matchedText: mod, message: `Dependency ${basePkg} not found`, severity: 'warning' });
                    }
                }
            }

            pathRegex.lastIndex = 0;
            while ((match = pathRegex.exec(lineText)) !== null) {
                const p = match[1];
                if (lineText.includes('import ') || lineText.includes('require(')) continue;

                const cleanPath = p.replace(/^\.\//, '').replace(/^\.\.\//, '').replace(/\.[^/.]+$/, "");
                if (!this.pathExistsRoughly(cleanPath, localPaths)) {
                    findings.push({ type: 'hallucinated_path', line: lineNum, matchedText: p, message: `Path ${p} not found in workspace`, severity: 'warning' });
                }
            }
        });

        return { hasIssues: findings.length > 0, findings };
    }

    private pathExistsRoughly(cleanPath: string, localPaths: Set<string>): boolean {
        for (const lp of localPaths) {
            if (lp.includes(cleanPath)) return true;
        }
        return false;
    }
}
