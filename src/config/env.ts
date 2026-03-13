export interface EnvConfig {
  port: number;
  implementerBaseUrl: string;
  implementerProjectApiKey: string;
  githubAgentUsername: string;
  githubWebhookSecret: string;
  githubToken: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): EnvConfig {
  return {
    port: parseInt(process.env['PORT'] || '3800', 10),
    implementerBaseUrl: requireEnv('IMPLEMENTER_BASE_URL').replace(/\/+$/, ''),
    implementerProjectApiKey: requireEnv('IMPLEMENTER_PROJECT_API_KEY'),
    githubAgentUsername: requireEnv('GITHUB_AGENT_USERNAME'),
    githubWebhookSecret: process.env['GITHUB_WEBHOOK_SECRET'] || '',
    githubToken: requireEnv('GITHUB_TOKEN'),
  };
}
