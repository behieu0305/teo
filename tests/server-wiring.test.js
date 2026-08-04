import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SERVER_SOURCE = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'server.js'),
  'utf8'
);

/** Returns the body of a top-level `async function <name>(...)` declaration. */
function functionBody(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  expect(start, `${name}() should exist in src/server.js`).toBeGreaterThan(-1);

  const open = source.indexOf('{', start);
  let depth = 0;

  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  throw new Error(`Could not find the end of ${name}()`);
}

// src/server.js wires the process together at module scope, so it cannot be
// imported in a test without opening a port and dialling MongoDB. These assert
// the wiring structurally instead.
describe('server wiring', () => {
  it('registers the Telegram webhook without waiting for MongoDB', () => {
    const connectBody = functionBody(SERVER_SOURCE, 'connectMongoUntilReady');

    // The bot needs the database to persist orders, nothing more. When webhook
    // registration lived inside this retry loop, a wrong MONGODB_URI left the
    // bot completely silent — /start never answered — while /health kept
    // returning 200 and Railway reported the deploy as healthy.
    expect(connectBody).not.toContain('configureWebhookOnce');
  });

  it('calls configureWebhookOnce() at module scope', () => {
    const topLevelCall = /^configureWebhookOnce\(\)/m.test(SERVER_SOURCE);
    expect(topLevelCall).toBe(true);
  });

  it('does not leave the module-scope webhook call unhandled', () => {
    const call = SERVER_SOURCE.slice(SERVER_SOURCE.search(/^configureWebhookOnce\(\)/m));
    // An unhandled rejection here would crash the process on Node's default
    // --unhandled-rejections=throw, taking the whole web service down.
    expect(call.slice(0, 200)).toMatch(/\.catch\(/);
  });
});
