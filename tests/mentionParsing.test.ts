import { describe, it, expect } from 'vitest';
import { mentionsBot, stripMention } from '../src/handlers/handleIssueCommentEvent.js';

describe('mentionsBot', () => {
  const botName = 'pavlin-dev-agent';

  it('detects mention at start', () => {
    expect(mentionsBot('@pavlin-dev-agent fix the bug', botName)).toBe(true);
  });

  it('detects mention in middle', () => {
    expect(mentionsBot('hey @pavlin-dev-agent please fix', botName)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(mentionsBot('@Pavlin-Dev-Agent fix it', botName)).toBe(true);
  });

  it('returns false when not mentioned', () => {
    expect(mentionsBot('fix the bug please', botName)).toBe(false);
  });

  it('returns false for partial match', () => {
    expect(mentionsBot('@pavlin fix', botName)).toBe(false);
  });
});

describe('stripMention', () => {
  const botName = 'pavlin-dev-agent';

  it('strips mention at start', () => {
    expect(stripMention('@pavlin-dev-agent fix the bug', botName)).toBe('fix the bug');
  });

  it('strips mention in middle', () => {
    expect(stripMention('hey @pavlin-dev-agent please fix', botName)).toBe('hey please fix');
  });

  it('strips multiple mentions', () => {
    expect(stripMention('@pavlin-dev-agent hey @pavlin-dev-agent', botName)).toBe('hey');
  });

  it('handles mention with no extra text', () => {
    expect(stripMention('@pavlin-dev-agent', botName)).toBe('');
  });

  it('is case-insensitive', () => {
    expect(stripMention('@Pavlin-Dev-Agent do it', botName)).toBe('do it');
  });
});
