type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

function formatLog(entry: LogEntry): string {
  const { level, msg, ...extra } = entry;
  const timestamp = new Date().toISOString();
  const extraStr = Object.keys(extra).length > 0 ? ' ' + JSON.stringify(extra) : '';
  return `${timestamp} [${level.toUpperCase()}] ${msg}${extraStr}`;
}

export const logger = {
  info(msg: string, extra: Record<string, unknown> = {}) {
    console.log(formatLog({ level: 'info', msg, ...extra }));
  },
  warn(msg: string, extra: Record<string, unknown> = {}) {
    console.warn(formatLog({ level: 'warn', msg, ...extra }));
  },
  error(msg: string, extra: Record<string, unknown> = {}) {
    console.error(formatLog({ level: 'error', msg, ...extra }));
  },
  debug(msg: string, extra: Record<string, unknown> = {}) {
    if (process.env['LOG_LEVEL'] === 'debug') {
      console.log(formatLog({ level: 'debug', msg, ...extra }));
    }
  },
};
