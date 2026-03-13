// GitHub webhook payload types (only the fields we use)

export interface GitHubUser {
  login: string;
  id: number;
}

export interface GitHubIssue {
  number: number;
  id: number;
  title: string;
  body: string | null;
  pull_request?: {
    url: string;
    html_url: string;
  };
  html_url: string;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
}

export interface GitHubRepository {
  full_name: string;
  name: string;
  owner: GitHubUser;
  html_url: string;
}

export interface IssuesEventPayload {
  action: string;
  issue: GitHubIssue;
  assignee?: GitHubUser;
  repository: GitHubRepository;
}

export interface IssueCommentEventPayload {
  action: string;
  issue: GitHubIssue;
  comment: GitHubComment;
  repository: GitHubRepository;
}

// Implementer API types (matched to live API docs)

export interface ImplementerCreateTaskRequest {
  prompt: string;
  continueTaskId?: string;
  callbackUrl?: string;
  repoUrl?: string;
  githubToken?: string;
}

export interface ImplementerCreateTaskResponse {
  taskId: string;
  branch: string | null;
  status: string;
  parentTaskId: string | null;
  chainId: string | null;
}

export interface ImplementerTaskStatus {
  taskId: string;
  branch: string | null;
  prompt: string;
  title: string | null;
  parentTaskId: string | null;
  chainId: string | null;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number;
  output: string | null;
  error: string | null;
  pullRequests: Array<{ repo: string; url: string }> | null;
}

export interface ImplementerTaskListResponse {
  tasks: ImplementerTaskStatus[];
}

// Database mapping type

export type CreatedFromEvent = 'assigned_issue' | 'issue_comment_continue' | 'pr_comment_continue';

export interface TaskMapping {
  id: number;
  repoFullName: string;
  issueNumber: number | null;
  prNumber: number | null;
  issueId: number | null;
  prUrl: string | null;
  implementerTaskId: string;
  implementerChainId: string | null;
  createdFromEvent: CreatedFromEvent;
  createdAt: string;
  updatedAt: string;
}
