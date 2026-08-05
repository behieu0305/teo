import crypto from 'node:crypto';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
// Tests assert on behaviour, not log lines, and the request log would bury the
// actual failures. LOG_LEVEL still wins when debugging a specific test.
const defaultLevel = process.env.NODE_ENV === 'test' ? LEVELS.silent : LEVELS.info;
const threshold = LEVELS[process.env.LOG_LEVEL] ?? defaultLevel;

// Telegraf redacts the bot token on the fetch() rejection path but NOT when
// `await res.json()` throws: node-fetch's message is literally
//   invalid json response body at https://api.telegram.org/bot<TOKEN>/getMe …
// Any non-JSON reply from the API path — an HTML 429 page, a proxy 407, a
// truncated 200 — therefore carries the whole token into whatever logs it.
// Every log site forwards a third-party error.message, so the scrub belongs
// here, at the one place they all funnel through, not at each call site.
const TOKEN_IN_URL = /\/bot(\d+):[A-Za-z0-9_-]{20,}/g;
const BARE_TOKEN = /\b\d{6,}:[A-Za-z0-9_-]{30,}\b/g;

export function redactSecrets(value) {
  if (typeof value === 'string') {
    return value.replaceAll(TOKEN_IN_URL, '/bot$1:<redacted>').replaceAll(BARE_TOKEN, '<redacted>');
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, redactSecrets(v)]));
  }
  return value;
}

function emit(level, message, fields) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...redactSecrets(fields),
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
        // originalUrl, not path: a mounted router rewrites req.url, so by the
        // time 'finish' runs every POST /api/orders logs as "/" and every
        // GET /api/orders/:id as "/<uuid>" — the access log cannot then tell
        // the authenticated endpoint apart from the site root.
        path: req.originalUrl?.split('?')[0] ?? req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs)
      });
    });

    next();
  };
}
