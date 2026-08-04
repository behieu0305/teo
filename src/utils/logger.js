import crypto from 'node:crypto';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
// Tests assert on behaviour, not log lines, and the request log would bury the
// actual failures. LOG_LEVEL still wins when debugging a specific test.
const defaultLevel = process.env.NODE_ENV === 'test' ? LEVELS.silent : LEVELS.info;
const threshold = LEVELS[process.env.LOG_LEVEL] ?? defaultLevel;

function emit(level, message, fields) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...fields,
    // Last so a caller passing `message` in the fields cannot overwrite the
    // event name and make the logs impossible to group by.
    message
  });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (message, fields) => emit('debug', message, fields),
  info: (message, fields) => emit('info', message, fields),
  warn: (message, fields) => emit('warn', message, fields),
  error: (message, fields) => emit('error', message, fields)
};

// Request ids let a failed order be traced from the HTTP log line to whatever
// the order route and the Telegram notifier logged for the same request.
export function requestLogger() {
  return (req, res, next) => {
    const requestId = req.get('x-request-id') ?? crypto.randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      // Health checks fire constantly and would drown out everything else.
      const level = res.statusCode >= 500 ? 'error' : req.path === '/health' ? 'debug' : 'info';
      emit(level, 'http_request', {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs)
      });
    });

    next();
  };
}
