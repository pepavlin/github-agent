import type { EnvConfig } from '../config/env.js';
import type { IssuesEventPayload } from '../domain/types.js';
import { ImplementerClient } from '../services/implementerApi.js';
import { GitHubApiClient } from '../services/githubApi.js';
import { insertTaskMapping } from '../db/repositories/taskMappingRepository.js';
import { logger } from '../utils/logger.js';

export async function handleIssuesEvent(
  payload: IssuesEventPayload,
  config: EnvConfig
): Promise<{ processed: boolean; reason: string }> {
  const { action, issue, assignee, repository } = payload;
  const repoFullName = repository.full_name;

  if (action !== 'assigned') {
    logger.info('Issues event ignored', { action, repo: repoFullName, issue: issue.number });
    return { processed: false, reason: `action "${action}" ignored` };
  }

  if (!assignee || assignee.login.toLowerCase() !== config.githubAgentUsername.toLowerCase()) {
    logger.info('Issue assigned to someone else', {
      assignee: assignee?.login,
      expected: config.githubAgentUsername,
      repo: repoFullName,
      issue: issue.number,
    });
    return { processed: false, reason: 'assigned to different user' };
  }

  logger.info('Processing issue assignment', { repo: repoFullName, issue: issue.number });

  const prompt = composeIssuePrompt(issue.title, issue.body);

  const implementer = new ImplementerClient(config);
  const github = new GitHubApiClient(config);

  try {
    const result = await implementer.createTask(prompt);

    logger.info('Implementer task created', {
      taskId: result.taskId,
      chainId: result.chainId,
      repo: repoFullName,
      issue: issue.number,
    });

    insertTaskMapping({
      repoFullName,
      issueNumber: issue.number,
      prNumber: null,
      issueId: issue.id,
      prUrl: null,
      implementerTaskId: result.taskId,
      implementerChainId: result.chainId,
      createdFromEvent: 'assigned_issue',
    });

    // Add rocket reaction (fire-and-forget)
    github.addIssueReaction(repoFullName, issue.number, 'rocket').catch(() => {});

    return { processed: true, reason: `task ${result.taskId} created` };
  } catch (err) {
    logger.error('Failed to create implementer task', {
      error: String(err),
      repo: repoFullName,
      issue: issue.number,
    });
    return { processed: false, reason: `implementer error: ${String(err)}` };
  }
}

function composeIssuePrompt(title: string, body: string | null): string {
  let prompt = `GitHub Issue: ${title}`;
  if (body && body.trim().length > 0) {
    prompt += `\n\n${body.trim()}`;
  }
  return prompt;
}
