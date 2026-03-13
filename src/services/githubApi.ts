import type { EnvConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class GitHubApiClient {
  private token: string;

  constructor(config: EnvConfig) {
    this.token = config.githubToken;
  }

  private async request(method: string, url: string, body?: unknown): Promise<Response> {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('GitHub API error', { status: response.status, url, body: errorBody });
    }

    return response;
  }

  /**
   * Add a reaction to an issue.
   */
  async addIssueReaction(repoFullName: string, issueNumber: number, reaction: string): Promise<void> {
    const url = `https://api.github.com/repos/${repoFullName}/issues/${issueNumber}/reactions`;
    try {
      await this.request('POST', url, { content: reaction });
      logger.info('Added issue reaction', { repoFullName, issueNumber, reaction });
    } catch (err) {
      logger.error('Failed to add issue reaction', { error: String(err) });
    }
  }

  /**
   * Add a reaction to a comment.
   */
  async addCommentReaction(repoFullName: string, commentId: number, reaction: string): Promise<void> {
    const url = `https://api.github.com/repos/${repoFullName}/issues/comments/${commentId}/reactions`;
    try {
      await this.request('POST', url, { content: reaction });
      logger.info('Added comment reaction', { repoFullName, commentId, reaction });
    } catch (err) {
      logger.error('Failed to add comment reaction', { error: String(err) });
    }
  }
}
