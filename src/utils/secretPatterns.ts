export interface SecretRule {
    id: string;
    name: string;
    pattern: RegExp;
    placeholder: string;
}

export const secretPatterns: SecretRule[] = [
    {
        id: 'AWS_ACCESS_KEY',
        name: 'AWS Access Key ID',
        pattern: /AKIA[0-9A-Z]{16}/g,
        placeholder: 'AWS_KEY'
    },
    {
        id: 'OPENAI_API_KEY',
        name: 'OpenAI API Key',
        pattern: /sk-[a-zA-Z0-9]{48,}/g,
        placeholder: 'OPENAI_KEY'
    },
    {
        id: 'GITHUB_PAT',
        name: 'GitHub Personal Access Token',
        pattern: /ghp_[a-zA-Z0-9]{36}/g,
        placeholder: 'GITHUB_TOKEN'
    },
    {
        id: 'STRIPE_SECRET',
        name: 'Stripe Secret Key',
        pattern: /sk_live_[0-9a-zA-Z]{24}/g,
        placeholder: 'STRIPE_KEY'
    },
    {
        id: 'PRIVATE_KEY',
        name: 'Private Key',
        pattern: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----[\s\S]*?-----END \1 KEY-----/g,
        placeholder: 'PRIVATE_KEY'
    },
    {
        id: 'GENERIC_BEARER',
        name: 'Bearer Token',
        pattern: /Bearer [a-zA-Z0-9\-_]{20,}/g,
        placeholder: 'BEARER_TOKEN'
    }
];
