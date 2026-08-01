import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

const base = {
  NODE_ENV: 'test',
  TELEGRAM_BOT_TOKEN: '123456789:abcdefghijklmnopqrstuvwxyzABCDE',
  TELEGRAM_MANAGER_IDS: '123456789',
  TELEGRAM_WEBHOOK_SECRET: 'a_secret_at_least_16_chars',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  PUBLIC_BASE_URL: 'https://example.test',
  MINI_APP_URL: 'https://example.test'
};

describe('TELEGRAM_MANAGER_IDS parsing', () => {
  it('reads a single id', () => {
    expect(loadConfig(base).managerIds).toEqual([123456789]);
  });

  it('reads several ids and trims whitespace', () => {
    const config = loadConfig({ ...base, TELEGRAM_MANAGER_IDS: '111, 222 ,333' });
    expect(config.managerIds).toEqual([111, 222, 333]);
  });

  it('ignores a trailing comma instead of inventing manager 0', () => {
    // Number('') is 0 and passes Number.isSafeInteger, so a stray comma used to
    // add a bogus manager whose notifications could never be delivered.
    const config = loadConfig({ ...base, TELEGRAM_MANAGER_IDS: '123456789,' });
    expect(config.managerIds).toEqual([123456789]);
  });

  it('drops duplicates so a manager is not messaged twice', () => {
    const config = loadConfig({ ...base, TELEGRAM_MANAGER_IDS: '111,111,222' });
    expect(config.managerIds).toEqual([111, 222]);
  });

  it('rejects non-numeric ids', () => {
    expect(() => loadConfig({ ...base, TELEGRAM_MANAGER_IDS: '@username' })).toThrow(
      /at least one numeric Telegram ID/
    );
  });

  it('rejects negative and zero ids', () => {
    expect(() => loadConfig({ ...base, TELEGRAM_MANAGER_IDS: '0,-5' })).toThrow(
      /at least one numeric Telegram ID/
    );
  });
});

describe('production guardrails', () => {
  it('refuses the dev auth bypass in production', () => {
    expect(() =>
      loadConfig({ ...base, NODE_ENV: 'production', ALLOW_DEV_TELEGRAM_BYPASS: 'true' })
    ).toThrow(/ALLOW_DEV_TELEGRAM_BYPASS must be false/);
  });

  it('requires HTTPS URLs in production', () => {
    expect(() =>
      loadConfig({
        ...base,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'http://example.test',
        MINI_APP_URL: 'http://example.test'
      })
    ).toThrow(/must use HTTPS/);
  });

  it('derives the public URL from RAILWAY_PUBLIC_DOMAIN', () => {
    const config = loadConfig({
      ...base,
      PUBLIC_BASE_URL: '',
      MINI_APP_URL: '',
      RAILWAY_PUBLIC_DOMAIN: 'teo.up.railway.app'
    });

    expect(config.PUBLIC_BASE_URL).toBe('https://teo.up.railway.app');
    expect(config.hasPublicBaseUrl).toBe(true);
  });

  it('flags a missing public domain rather than pretending one exists', () => {
    const config = loadConfig({ ...base, PUBLIC_BASE_URL: '', MINI_APP_URL: '' });
    expect(config.hasPublicBaseUrl).toBe(false);
  });
});

describe('initData lifetime', () => {
  it('defaults to a window shorter than Telegram’s one hour maximum', () => {
    expect(loadConfig(base).INIT_DATA_MAX_AGE_SECONDS).toBe(600);
  });

  it('accepts an override', () => {
    expect(loadConfig({ ...base, INIT_DATA_MAX_AGE_SECONDS: '300' }).INIT_DATA_MAX_AGE_SECONDS).toBe(
      300
    );
  });
});
