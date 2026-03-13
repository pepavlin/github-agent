# GitHub Agent

A lightweight service that reacts to GitHub webhooks (issue assignments and bot mentions) and forwards work to an [Implementer](https://implementer.pavlin.dev) service for automated code task execution.

## How it works

### Issue assignment → New implementer task
1. A GitHub issue is assigned to the bot user (e.g. `pavlin-dev-agent`)
2. The agent creates a new implementer task with the issue title + body as prompt
3. A 🚀 reaction is added to the issue
4. The mapping (repo, issue, task ID, chain ID) is stored in SQLite

### Bot mention in comment → Continue existing task
1. Someone comments on an issue or PR mentioning `@pavlin-dev-agent`
2. The agent strips the mention, finds the existing task chain from the database
3. A continuation task is created on the implementer (inheriting the branch/chain)
4. A 🚀 reaction is added to the comment
5. The new mapping is stored

### PR comments
PR conversation comments arrive as `issue_comment` events. The agent detects PRs by checking `payload.issue.pull_request` and looks up mappings by PR number first, then falls back to issue-based mappings.

## Setup

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3800`) |
| `IMPLEMENTER_BASE_URL` | Implementer API URL (e.g. `https://implementer.pavlin.dev`) |
| `IMPLEMENTER_PROJECT_API_KEY` | Bearer token for the implementer API |
| `GITHUB_AGENT_USERNAME` | GitHub username of the bot (e.g. `pavlin-dev-agent`) |
| `GITHUB_WEBHOOK_SECRET` | Secret used to validate webhook signatures |
| `GITHUB_TOKEN` | GitHub token for adding reactions |

### 2. Run with Docker Compose

```bash
docker compose up -d --build
```

The service will be available at `http://localhost:${PORT}`.

SQLite data is persisted in a Docker volume (`agent-data`).

### 3. Configure GitHub webhook

In your GitHub repository (or organization) settings:

1. Go to **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://your-server.com/github/webhook`
3. **Content type**: `application/json`
4. **Secret**: Same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
5. **Events to enable**:
   - ✅ **Issues** — triggers on issue assignment
   - ✅ **Issue comments** — triggers on comments mentioning the bot
6. Click **Add webhook**

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/github/webhook` | GitHub webhook receiver |
| `GET` | `/health` | Health check |

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Build
npm run build

# Run tests
npm test

# Start production build
npm start
```

## Request flow

```
GitHub webhook (issue assigned / comment created)
  ↓
POST /github/webhook
  ↓
Validate X-Hub-Signature-256
  ↓
Route by X-GitHub-Event (issues / issue_comment)
  ↓
Filter: correct action? bot assigned/mentioned?
  ↓
Lookup existing task mapping in SQLite
  ↓
POST implementer /task (create or continue)
  ↓
Store new mapping in SQLite
  ↓
Add 🚀 reaction via GitHub API
  ↓
Return 200 to GitHub
```

## Project structure

```
src/
  index.ts                              # Entry point
  app.ts                                # Fastify app setup
  config/env.ts                         # Environment config
  routes/githubWebhook.ts               # Webhook route + signature validation
  handlers/
    handleIssuesEvent.ts                # Issue assignment handler
    handleIssueCommentEvent.ts          # Comment mention handler
  services/
    implementerApi.ts                   # Implementer REST client
    githubApi.ts                        # GitHub API client (reactions)
  db/
    sqlite.ts                           # Database setup
    migrations.ts                       # Schema migrations
    repositories/taskMappingRepository.ts
  domain/types.ts                       # Shared TypeScript types
  utils/
    githubSignature.ts                  # HMAC-SHA256 verification
    logger.ts                           # Structured logger
tests/
  githubSignature.test.ts
  mentionParsing.test.ts
  issueFiltering.test.ts
  mappingLookup.test.ts
```
