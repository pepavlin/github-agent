import type { FastifyInstance } from 'fastify';
import type { EnvConfig } from '../config/env.js';
import type { IssuesEventPayload, IssueCommentEventPayload } from '../domain/types.js';
import { verifyGitHubSignature } from '../utils/githubSignature.js';
import { handleIssuesEvent } from '../handlers/handleIssuesEvent.js';
import { handleIssueCommentEvent } from '../handlers/handleIssueCommentEvent.js';
import { logger } from '../utils/logger.js';

export function registerWebhookRoute(app: FastifyInstance, config: EnvConfig): void {
  // We need the raw body for signature verification.
  // Fastify v5 with content-type parser override:
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    }
  );

  app.post('/github/webhook', async (request, reply) => {
    const rawBody = request.body as Buffer;
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const event = request.headers['x-github-event'] as string | undefined;

    // Validate signature
    if (!verifyGitHubSignature(rawBody, signature, config.githubWebhookSecret)) {
      logger.warn('Invalid webhook signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    if (!event) {
      return reply.status(400).send({ error: 'Missing X-GitHub-Event header' });
    }

    const payload = JSON.parse(rawBody.toString('utf-8'));

    logger.info('Webhook received', { event, action: payload.action });

    // Route by event type
    switch (event) {
      case 'issues': {
        const result = await handleIssuesEvent(payload as IssuesEventPayload, config);
        return reply.send({ ok: true, ...result });
      }

      case 'issue_comment': {
        const result = await handleIssueCommentEvent(payload as IssueCommentEventPayload, config);
        return reply.send({ ok: true, ...result });
      }

      default: {
        logger.info('Ignoring unsupported event', { event });
        return reply.send({ ok: true, processed: false, reason: `event "${event}" not handled` });
      }
    }
  });
}
