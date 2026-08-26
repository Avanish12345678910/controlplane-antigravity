### A4. Complex Prompt → No Downgrade

**Purpose:** Confirms `CostEngine` correctly identifies a complex, code-containing prompt as HIGH complexity and does not suggest downgrading.

**Model:** gpt-4o

**Prompt:**
class UserService {
  private db: Database;
  constructor(db: Database) { this.db = db; }
  async getUser(id: string) {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }
  async createUser(name: string, email: string) {
    const result = await this.db.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email]);
    return result.rows[0];
  }
}


**Mock AI Response:** (leave empty)

**Expected Result:**

| Section | Badge | Notes |
|---|---|---|
| Responsibility | PASS | No secrets |
| Cost | PASS | hasCodeBlocks is true → automatically classified HIGH, no downgrade suggested for gpt-4o |
| Performance | PASS | Skipped |

**What this shows:** The presence of a triple-backtick code block, or 4-space indentation, immediately disqualifies a prompt from LOW classification regardless of token count. This prevents the engine from downgrading a model for genuinely complex coding tasks just because the surrounding prose is short.