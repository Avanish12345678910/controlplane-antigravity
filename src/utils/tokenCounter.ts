import { get_encoding, Tiktoken } from 'tiktoken';

export class TokenCounter {
    private encoder: Tiktoken | null = null;
    
    constructor() {
        try {
            this.encoder = get_encoding('cl100k_base');
        } catch (e) {
            // Initialization failed
        }
    }

    public count(text: string): number {
        if (!text) return 0;
        
        try {
            if (this.encoder) {
                return this.encoder.encode(text).length;
            }
        } catch (e) {
            // Encoding failed
        }
        
        // Fallback heuristic: roughly 4 chars per token
        return Math.ceil(text.length / 4);
    }
}
