import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IssuesEventPayload } from '../src/domain/types.js';

// Mock dependencies before importing the handler
vi.mock('../src/services/implementerApi.js', () => ({
  ImplementerClient: vi.fn().mockImplementation(() => ({
    createTask: vi.fn().mockResolvedValue({
      taskId: 'test-task-id',
      branch: null,
      status: 'starting',
      parentTaskId: null,
      chainId: 'test-chain-id',
    }),
  })),
}));

vi.mock('../src/services/githubApi.js', () => ({
  GitHubApiClient: vi.fn().mockImplementation(() => ({
    addIssueReaction: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../src/db/repositories/taskMappingRepository.js', () => ({
  insertTaskMapping: vi.fn().mockReturnValue({ id: 1 }),
  findByRepoAndIssue: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../src/db/sqlite.js', () => ({
  getDb: vi.fn(),
}));

import { handleIssuesEvent } from '../src/handlers/handleIssuesEvent.js';

const baseConfig = {
  port: 3800,
  implementerBaseUrl: 'http://localhost',
  implementerProjectApiKey: 'test-key',
  githubAgentUsername: 'test-bot',
  githubWebhookSecret: 'secret',
  githubToken: 'gh-token',
};

function makePayload(overrides: Partial<IssuesEventPayload> = {}): IssuesEventPayload {
  return {
    action: 'assigned',
    issue: {
      number: 42,
      id: 12345,
      title: 'Test issue',
      body: 'Fix this thing',
      html_url: 'https://github.com/org/repo/issues/42',
    },
    assignee: { login: 'test-bot', id: 1 },
    repository: {
      full_name: 'org/repo',
      name: 'repo',
      owner: { login: 'org', id: 2 },
      html_url: 'https://github.com/org/repo',
    },
    ...overrides,
  };
}

describe('handleIssuesEvent filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores non-assigned actions', async () => {
    const result = await handleIssuesEvent(makePayload({ action: 'opened' }), baseConfig);
    expect(result.processed).toBe(false);
    expect(result.reason).toContain('ignored');
  });

  it('ignores assignment to other users', async () => {
    const result = await handleIssuesEvent(
      makePayload({ assignee: { login: 'other-user', id: 99 } }),
      baseConfig
    );
    expect(result.processed).toBe(false);
    expect(result.reason).toContain('different user');
  });

  it('processes assignment to bot (case insensitive)', async () => {
    const result = await handleIssuesEvent(
      makePayload({ assignee: { login: 'Test-Bot', id: 1 } }),
      baseConfig
    );
    expect(result.processed).toBe(true);
  });

  it('processes valid assignment', async () => {
    const result = await handleIssuesEvent(makePayload(), baseConfig);
    expect(result.processed).toBe(true);
    expect(result.reason).toContain('task');
  });
});
