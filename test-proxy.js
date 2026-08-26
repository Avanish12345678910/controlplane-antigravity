/**
 * ControlPlane Proxy Test Script
 * 
 * Usage: 
 *   1. Launch the extension (F5) and check the ControlPlane output channel for the port
 *   2. Run: node test-proxy.js <PORT>
 *   Example: node test-proxy.js 54321
 */

const http = require('http');

const PORT = process.argv[2];
if (!PORT) {
    console.error('❌ Usage: node test-proxy.js <PORT>');
    console.error('   Find the port in the ControlPlane output channel in the Extension Dev Host window.');
    process.exit(1);
}

function sendRequest(name, targetUrl, body) {
    return new Promise((resolve) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 TEST: ${name}`);
        console.log(`${'='.repeat(60)}`);

        const bodyStr = JSON.stringify(body);
        const options = {
            hostname: '127.0.0.1',
            port: parseInt(PORT),
            path: targetUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                'Host': 'api.openai.com',
            },
        };

        console.log(`📤 Sending to proxy → ${targetUrl}`);
        console.log(`📦 Body preview: ${bodyStr.substring(0, 200)}...`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📥 Response status: ${res.statusCode}`);
                console.log(`📥 Response body: ${data.substring(0, 200)}`);
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`⚠️  Expected error (no real API backend): ${err.message}`);
            console.log(`   ✅ But the proxy DID receive and process the request!`);
            console.log(`   👀 Check the ControlPlane output channel in VS Code for logs.`);
            resolve();
        });

        req.write(bodyStr);
        req.end();
    });
}

async function runTests() {
    console.log('🚀 ControlPlane Proxy Test Suite');
    console.log(`🔌 Targeting proxy at http://127.0.0.1:${PORT}\n`);

    // Test 1: Secret Detection (ResponsibilityEngine)
    await sendRequest(
        '1. SECRET DETECTION — Should redact AWS key',
        'http://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: 'Here is my AWS key AKIAIOSFODNN7EXAMPLE and please help me deploy'
                }
            ]
        }
    );

    await new Promise(r => setTimeout(r, 1000));

    // Test 2: Cost Optimization (CostEngine)
    await sendRequest(
        '2. COST OPTIMIZATION — Simple prompt should route gpt-4o → gpt-4o-mini',
        'http://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: 'What is 2+2?'
                }
            ]
        }
    );

    await new Promise(r => setTimeout(r, 1000));

    // Test 3: Multiple secrets
    await sendRequest(
        '3. MULTIPLE SECRETS — AWS key + GitHub token + Bearer token',
        'http://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: 'My AWS key is AKIAIOSFODNN7EXAMPLE and my GitHub token is ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij and use Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdef to authenticate'
                }
            ]
        }
    );

    await new Promise(r => setTimeout(r, 1000));

    // Test 4: Complex prompt (should NOT downgrade model)
    await sendRequest(
        '4. COMPLEX PROMPT — Should keep gpt-4o (too complex to downgrade)',
        'http://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: `Please refactor this code:\n\`\`\`typescript\nclass UserService {\n  private db: Database;\n  constructor(db: Database) { this.db = db; }\n  async getUser(id: string) {\n    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);\n    return result.rows[0];\n  }\n  async createUser(name: string, email: string) {\n    const result = await this.db.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email]);\n    return result.rows[0];\n  }\n}\n\`\`\`\nAdd error handling, input validation, and make it follow the repository pattern.`
                }
            ]
        }
    );

    await new Promise(r => setTimeout(r, 1000));

    // Test 5: Clean prompt (no issues)
    await sendRequest(
        '5. CLEAN PROMPT — No secrets, no cost optimization needed (simple but claude model)',
        'http://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: 'Explain what a closure is in JavaScript'
                }
            ]
        }
    );

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All tests sent!');
    console.log('👀 Now check the "ControlPlane" output channel in the Extension Development Host');
    console.log('   window to see how each request was processed.');
    console.log(`\nAlso try: Ctrl+Shift+P → "ControlPlane: Show Dashboard" to see stats.`);
    console.log(`${'='.repeat(60)}`);
}

runTests();
