import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const IS_DEV = process.env.COZE_PROJECT_ENV !== 'PROD';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile(level: LogLevel): string {
  const date = new Date().toISOString().slice(0, 10);
  const prefix = level === 'error' ? 'error' : 'app';
  return path.join(LOG_DIR, `${prefix}-${date}.log`);
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

function formatLine(level: LogLevel, message: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const extra = args.length > 0 ? ` ${args.map(serializeArg).join(' ')}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${extra}\n`;
}

function write(level: LogLevel, message: string, ...args: unknown[]) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[getMinLevel()]) return;

  ensureLogDir();
  const line = formatLine(level, message, args);

  try {
    fs.appendFileSync(getLogFile(level), line, 'utf8');
  } catch {
    // 文件写入失败时静默降级到控制台
  }

  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (IS_DEV || level === 'error' || level === 'warn') {
    consoleFn(`[${level.toUpperCase()}]`, message, ...args);
  }
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => write('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => write('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => write('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => write('error', message, ...args),
};
