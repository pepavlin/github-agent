import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_full_name TEXT NOT NULL,
      issue_number INTEGER,
      pr_number INTEGER,
      issue_id INTEGER,
      pr_url TEXT,
      implementer_task_id TEXT NOT NULL,
      implementer_chain_id TEXT,
      created_from_event TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_task_mappings_repo_issue
      ON task_mappings(repo_full_name, issue_number);

    CREATE INDEX IF NOT EXISTS idx_task_mappings_repo_pr
      ON task_mappings(repo_full_name, pr_number);

    CREATE INDEX IF NOT EXISTS idx_task_mappings_chain
      ON task_mappings(implementer_chain_id);

    CREATE INDEX IF NOT EXISTS idx_task_mappings_task
      ON task_mappings(implementer_task_id);
  `);
}
