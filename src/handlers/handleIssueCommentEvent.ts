import type { EnvConfig } from '../config/env.js';
import type { IssueCommentEventPayload } from '../domain/types.js';
import { ImplementerClient } from '../services/implementerApi.js';
import { GitHubApiClient } from '../services/githubApi.js';
import {
  findByRepoAndPr,
  findByRepoAndIssue,
  insertTaskMapping,
} from '../db/repositories/taskMappingRepository.js';
import { logger } from '../utils/logger.js';

export async function handleIssueCommentEvent(
  payload: IssueCommentEventPayload,
  config: EnvConfig
): Promise<{ processed: boolean; reason: string }> {
  const { action, issue, comment, repository } = payload;
  const repoFullName = repository.full_name;

  if (action !== 'created') {
    logger.info('Issue comment event ignored', { action, repo: repoFullName, issue: issue.number });
    return { processed: false, reason: `action "${action}" ignored` };
  }

  if (!mentionsBot(comment.body, config.githubAgentUsername)) {
    logger.debug('Comment does not mention bot', { repo: repoFullName, issue: issue.number });
    return { processed: false, reason: 'bot not mentioned' };
  }

  const isPr = !!issue.pull_request;
  const prompt = stripMention(comment.body, config.githubAgentUsername);

  if (!prompt) {
    logger.info('Empty prompt after stripping mention, ignoring', { repo: repoFullName, issue: issue.number });
    return { processed: false, reason: 'empty prompt after stripping mention' };
  }

  logger.info('Processing bot mention', {
    repo: repoFullName,
    issue: issue.number,
    isPr,
    commentId: comment.id,
  });

  // Find existing mapping to continue the chain
  let existingMapping = isPr
    ? findByRepoAndPr(repoFullName, issue.number)
    : findByRepoAndIssue(repoFullName, issue.number);

  // If PR comment but no PR-specific mapping, try the issue mapping
  // (the PR was likely created from an issue that was already tracked)
  if (!existingMapping && isPr) {
    existingMapping = findByRepoAndIssue(repoFullName, issue.number);
  }

  const implementer = new ImplementerClient(config);
  const github = new GitHubApiClient(config);

  try {
    let result;

    if (existingMapping) {
      // Continue the existing chain by using the most recent task ID
      logger.info('Continuing existing task chain', {
        continueTaskId: existingMapping.implementerTaskId,
        chainId: existingMapping.implementerChainId,
      });
      result = await implementer.continueTask(prompt, existingMapping.implementerTaskId);
    } else {
      // No mapping found — create a new task
      logger.warn('No existing mapping found for continuation, creating new task', {
        repo: repoFullName,
        issue: issue.number,
        isPr,
      });
      result = await implementer.createTask(prompt, {
        repoUrl: repository.html_url + '.git',
        githubToken: config.githubToken,
      });
    }

    logger.info('Implementer task created/continued', {
      taskId: result.taskId,
      chainId: result.chainId,
      repo: repoFullName,
      issue: issue.number,
      isPr,
    });

    // Store the new mapping
    const eventType = isPr ? 'pr_comment_continue' as const : 'issue_comment_continue' as const;
    insertTaskMapping({
      repoFullName,
      issueNumber: isPr ? null : issue.number,
      prNumber: isPr ? issue.number : null,
      issueId: isPr ? null : issue.id,
      prUrl: isPr ? issue.pull_request?.html_url ?? null : null,
      implementerTaskId: result.taskId,
      implementerChainId: result.chainId,
      createdFromEvent: eventType,
    });

    // Add rocket reaction (fire-and-forget)
    github.addCommentReaction(repoFullName, comment.id, 'rocket').catch(() => {});

    return { processed: true, reason: `task ${result.taskId} ${existingMapping ? 'continued' : 'created'}` };
  } catch (err) {
    logger.error('Failed to process comment', {
      error: String(err),
      repo: repoFullName,
      issue: issue.number,
    });
    return { processed: false, reason: `implementer error: ${String(err)}` };
  }
}

/**
 * Check if comment body mentions the bot username.
 */
export function mentionsBot(body: string, botUsername: string): boolean {
  const regex = new RegExp(`@${escapeRegex(botUsername)}(?:\\b|$)`, 'i');
  return regex.test(body);
}

/**
 * Strip the @botname mention from the comment body.
 */
export function stripMention(body: string, botUsername: string): string {
  const regex = new RegExp(`@${escapeRegex(botUsername)}\\s*`, 'gi');
  return body.replace(regex, '').trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
