import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export class LocalFileIndexer {
    private dependencies = new Set<string>();
    private localPaths = new Set<string>();
    private exportedSymbols = new Set<string>();
    private workspaceRoot: string | undefined;
    private watcher: vscode.Disposable | undefined;

    constructor() {
        this.watcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (this.workspaceRoot && doc.uri.fsPath.startsWith(this.workspaceRoot)) {
                if (doc.fileName.endsWith('package.json') || doc.fileName.endsWith('requirements.txt') || doc.fileName.endsWith('go.mod') || doc.fileName.endsWith('Cargo.toml')) {
                    this.buildIndex(this.workspaceRoot);
                } else {
                    await this.indexSourceFile(doc.uri.fsPath);
                }
            }
        });
    }

    public async buildIndex(workspaceRoot: string): Promise<void> {
        this.workspaceRoot = workspaceRoot;
        this.dependencies.clear();
        this.localPaths.clear();
        this.exportedSymbols.clear();

        try {
            const pkgData = await fs.readFile(path.join(workspaceRoot, 'package.json'), 'utf8');
            const pkg = JSON.parse(pkgData);
            if (pkg.dependencies) Object.keys(pkg.dependencies).forEach(d => this.dependencies.add(d));
            if (pkg.devDependencies) Object.keys(pkg.devDependencies).forEach(d => this.dependencies.add(d));
        } catch {}

        try {
            const reqData = await fs.readFile(path.join(workspaceRoot, 'requirements.txt'), 'utf8');
            reqData.split('\n').forEach(line => {
                const pkg = line.split('==')[0].trim();
                if (pkg && !pkg.startsWith('#')) this.dependencies.add(pkg);
            });
        } catch {}

        try {
            const goModData = await fs.readFile(path.join(workspaceRoot, 'go.mod'), 'utf8');
            goModData.split('\n').forEach(line => {
                if (line.trim().startsWith('require ')) {
                    const parts = line.trim().replace(/\(/g, '').split(/\s+/);
                    if (parts[1]) this.dependencies.add(parts[1]);
                }
            });
        } catch {}

        try {
            const cargoData = await fs.readFile(path.join(workspaceRoot, 'Cargo.toml'), 'utf8');
            let inDeps = false;
            cargoData.split('\n').forEach(line => {
                if (line.trim().startsWith('[dependencies]')) inDeps = true;
                else if (line.trim().startsWith('[')) inDeps = false;
                else if (inDeps && line.includes('=')) this.dependencies.add(line.split('=')[0].trim());
            });
        } catch {}

        await this.walkDir(workspaceRoot);
    }

    private async walkDir(dir: string) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const res = path.resolve(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                        await this.walkDir(res);
                    }
                } else if (/\.(ts|js|py|go|rs)$/.test(entry.name)) {
                    await this.indexSourceFile(res);
                }
            }
        } catch {}
    }

    private async indexSourceFile(filePath: string) {
        if (!this.workspaceRoot) return;
        const relPath = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/');
        const noExt = relPath.replace(/\.[^/.]+$/, "");
        this.localPaths.add(noExt);

        if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const regex = /export\s+(function|class|const|interface|type)\s+(\w+)/g;
                let match;
                while ((match = regex.exec(content)) !== null) {
                    this.exportedSymbols.add(match[2]);
                }
            } catch {}
        }
    }

    public getDependencies() { return this.dependencies; }
    public getLocalPaths() { return this.localPaths; }
    public getExportedSymbols() { return this.exportedSymbols; }

    public dispose() {
        if (this.watcher) this.watcher.dispose();
    }
}
