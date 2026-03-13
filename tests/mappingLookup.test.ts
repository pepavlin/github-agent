import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrations.js';
import * as sqliteModule from '../src/db/sqlite.js';
import { vi } from 'vitest';

// We test the repository functions with a real in-memory SQLite database
let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  runMigrations(db);

  // Mock getDb to return our test database
  vi.spyOn(sqliteModule, 'getDb').mockReturnValue(db);
});

afterEach(() => {
  db.close();
  vi.restoreAllMocks();
});

// Import after mock setup
import {
  insertTaskMapping,
  findByRepoAndIssue,
  findByRepoAndPr,
  findByChainId,
  findAllByRepoAndIssue,
} from '../src/db/repositories/taskMappingRepository.js';

describe('taskMappingRepository', () => {
  it('inserts and retrieves a mapping by repo + issue', () => {
    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: 1,
      prNumber: null,
      issueId: 100,
      prUrl: null,
      implementerTaskId: 'task-abc',
      implementerChainId: 'chain-xyz',
      createdFromEvent: 'assigned_issue',
    });

    const found = findByRepoAndIssue('org/repo', 1);
    expect(found).toBeDefined();
    expect(found!.implementerTaskId).toBe('task-abc');
    expect(found!.implementerChainId).toBe('chain-xyz');
  });

  it('retrieves by repo + PR number', () => {
    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: null,
      prNumber: 5,
      issueId: null,
      prUrl: 'https://github.com/org/repo/pull/5',
      implementerTaskId: 'task-pr',
      implementerChainId: 'chain-pr',
      createdFromEvent: 'pr_comment_continue',
    });

    const found = findByRepoAndPr('org/repo', 5);
    expect(found).toBeDefined();
    expect(found!.implementerTaskId).toBe('task-pr');
  });

  it('retrieves by chain ID', () => {
    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: 1,
      prNumber: null,
      issueId: 100,
      prUrl: null,
      implementerTaskId: 'task-1',
      implementerChainId: 'chain-shared',
      createdFromEvent: 'assigned_issue',
    });

    const found = findByChainId('chain-shared');
    expect(found).toBeDefined();
    expect(found!.implementerTaskId).toBe('task-1');
  });

  it('returns most recent mapping when multiple exist', () => {
    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: 1,
      prNumber: null,
      issueId: 100,
      prUrl: null,
      implementerTaskId: 'task-old',
      implementerChainId: 'chain-1',
      createdFromEvent: 'assigned_issue',
    });

    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: 1,
      prNumber: null,
      issueId: 100,
      prUrl: null,
      implementerTaskId: 'task-new',
      implementerChainId: 'chain-1',
      createdFromEvent: 'issue_comment_continue',
    });

    const found = findByRepoAndIssue('org/repo', 1);
    expect(found!.implementerTaskId).toBe('task-new');
  });

  it('returns all mappings for repo + issue', () => {
    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: 1,
      prNumber: null,
      issueId: 100,
      prUrl: null,
      implementerTaskId: 'task-1',
      implementerChainId: null,
      createdFromEvent: 'assigned_issue',
    });

    insertTaskMapping({
      repoFullName: 'org/repo',
      issueNumber: 1,
      prNumber: null,
      issueId: 100,
      prUrl: null,
      implementerTaskId: 'task-2',
      implementerChainId: null,
      createdFromEvent: 'issue_comment_continue',
    });

    const all = findAllByRepoAndIssue('org/repo', 1);
    expect(all).toHaveLength(2);
  });

  it('returns undefined for nonexistent mapping', () => {
    expect(findByRepoAndIssue('org/repo', 999)).toBeUndefined();
    expect(findByRepoAndPr('org/repo', 999)).toBeUndefined();
    expect(findByChainId('nonexistent')).toBeUndefined();
  });
});
