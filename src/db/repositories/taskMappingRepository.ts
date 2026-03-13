import { getDb } from '../sqlite.js';
import type { TaskMapping, CreatedFromEvent } from '../../domain/types.js';

interface InsertTaskMapping {
  repoFullName: string;
  issueNumber: number | null;
  prNumber: number | null;
  issueId: number | null;
  prUrl: string | null;
  implementerTaskId: string;
  implementerChainId: string | null;
  createdFromEvent: CreatedFromEvent;
}

function rowToMapping(row: Record<string, unknown>): TaskMapping {
  return {
    id: row['id'] as number,
    repoFullName: row['repo_full_name'] as string,
    issueNumber: row['issue_number'] as number | null,
    prNumber: row['pr_number'] as number | null,
    issueId: row['issue_id'] as number | null,
    prUrl: row['pr_url'] as string | null,
    implementerTaskId: row['implementer_task_id'] as string,
    implementerChainId: row['implementer_chain_id'] as string | null,
    createdFromEvent: row['created_from_event'] as CreatedFromEvent,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

export function insertTaskMapping(mapping: InsertTaskMapping): TaskMapping {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO task_mappings (
      repo_full_name, issue_number, pr_number, issue_id, pr_url,
      implementer_task_id, implementer_chain_id, created_from_event
    ) VALUES (
      @repoFullName, @issueNumber, @prNumber, @issueId, @prUrl,
      @implementerTaskId, @implementerChainId, @createdFromEvent
    )
  `);

  const result = stmt.run(mapping);
  return findById(result.lastInsertRowid as number)!;
}

export function findById(id: number): TaskMapping | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM task_mappings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToMapping(row) : undefined;
}

/**
 * Find the most recent mapping for a given repo + issue number.
 * Used to find the chain to continue when a comment is made on an issue.
 */
export function findByRepoAndIssue(repoFullName: string, issueNumber: number): TaskMapping | undefined {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT * FROM task_mappings WHERE repo_full_name = ? AND issue_number = ? ORDER BY id DESC LIMIT 1'
    )
    .get(repoFullName, issueNumber) as Record<string, unknown> | undefined;
  return row ? rowToMapping(row) : undefined;
}

/**
 * Find the most recent mapping for a given repo + PR number.
 * Used to find the chain to continue when a PR comment mentions the bot.
 */
export function findByRepoAndPr(repoFullName: string, prNumber: number): TaskMapping | undefined {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT * FROM task_mappings WHERE repo_full_name = ? AND pr_number = ? ORDER BY id DESC LIMIT 1'
    )
    .get(repoFullName, prNumber) as Record<string, unknown> | undefined;
  return row ? rowToMapping(row) : undefined;
}

/**
 * Find any mapping by chain ID (to get the chain for continuation).
 */
export function findByChainId(chainId: string): TaskMapping | undefined {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM task_mappings WHERE implementer_chain_id = ? ORDER BY id DESC LIMIT 1')
    .get(chainId) as Record<string, unknown> | undefined;
  return row ? rowToMapping(row) : undefined;
}

/**
 * Find all mappings for a repo + issue (may include both the original issue assignment
 * and subsequent PR mappings).
 */
export function findAllByRepoAndIssue(repoFullName: string, issueNumber: number): TaskMapping[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM task_mappings WHERE repo_full_name = ? AND issue_number = ? ORDER BY id DESC')
    .all(repoFullName, issueNumber) as Record<string, unknown>[];
  return rows.map(rowToMapping);
}
