import type { EnvConfig } from '../config/env.js';
import type {
  ImplementerCreateTaskRequest,
  ImplementerCreateTaskResponse,
  ImplementerTaskStatus,
  ImplementerTaskListResponse,
} from '../domain/types.js';
import { logger } from '../utils/logger.js';

export class ImplementerClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: EnvConfig) {
    this.baseUrl = config.implementerBaseUrl;
    this.apiKey = config.implementerProjectApiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    logger.debug('Implementer API request', { method, url });

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Implementer API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Create a new implementer task.
   */
  async createTask(prompt: string, options?: { continueTaskId?: string; repoUrl?: string; githubToken?: string }): Promise<ImplementerCreateTaskResponse> {
    const payload: ImplementerCreateTaskRequest = {
      prompt,
      ...options,
    };

    logger.info('Creating implementer task', { continueTaskId: options?.continueTaskId });
    return this.request<ImplementerCreateTaskResponse>('POST', '/task', payload);
  }

  /**
   * Continue an existing implementer task chain by creating a new task
   * that inherits the branch and chain from the specified task.
   */
  async continueTask(prompt: string, continueTaskId: string): Promise<ImplementerCreateTaskResponse> {
    return this.createTask(prompt, { continueTaskId });
  }

  /**
   * Get status of a specific task.
   */
  async getTask(taskId: string): Promise<ImplementerTaskStatus> {
    return this.request<ImplementerTaskStatus>('GET', `/task/${encodeURIComponent(taskId)}`);
  }

  /**
   * List all tasks, optionally filtered by status or chain ID.
   */
  async listTasks(options?: { status?: string[]; chainId?: string }): Promise<ImplementerTaskListResponse> {
    const params = new URLSearchParams();
    if (options?.status) {
      for (const s of options.status) {
        params.append('status', s);
      }
    }
    if (options?.chainId) {
      params.set('chainId', options.chainId);
    }
    const query = params.toString();
    const path = query ? `/tasks?${query}` : '/tasks';
    return this.request<ImplementerTaskListResponse>('GET', path);
  }
}
