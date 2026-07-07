type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_DEV = process.env.COZE_PROJECT_ENV !== 'PROD';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LEVEL_PRIORITY) return envLevel;
  return IS_DEV ? 'debug' : 'info';
}

function serializeArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function write(level: LogLevel, message: string, ...args: unknown[]) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[getMinLevel()]) return;

  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (IS_DEV || level === 'error' || level === 'warn') {
    consoleFn(`[${level.toUpperCase()}]`, message, ...args);
  }

  // 生产环境（EdgeOne/Vercel 等）不写本地文件，避免只读文件系统导致二次崩溃
  if (!IS_DEV) return;

  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const date = new Date().toISOString().slice(0, 10);
    const prefix = level === 'error' ? 'error' : 'app';
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${args.length ? ` ${args.map(serializeArg).join(' ')}` : ''}\n`;
    fs.appendFileSync(path.join(logDir, `${prefix}-${date}.log`), line, 'utf8');
  } catch {
    // ignore
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => write('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => write('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => write('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => write('error', message, ...args),
};
