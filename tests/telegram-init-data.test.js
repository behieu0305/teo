import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyTelegramInitData } from '../src/utils/telegram-init-data.js';

const BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDE';

// Builds initData exactly the way Telegram does, so a change to the signing
// scheme fails here rather than silently accepting forged requests.
function signInitData(fields, botToken = BOT_TOKEN) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.set('hash', hash);
  return params.toString();
}

function validFields(overrides = {}) {
  return {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAH-test',
    user: JSON.stringify({ id: 999001, first_name: 'Khách', username: 'customer_test' }),
    ...overrides
  };
}

describe('verifyTelegramInitData', () => {
  it('accepts data signed with the bot token', () => {
    const user = verifyTelegramInitData(signInitData(validFields()), BOT_TOKEN);

    expect(user.id).toBe(999001);
    expect(user.username).toBe('customer_test');
  });

  it('rejects a tampered field', () => {
    const initData = signInitData(validFields());
    const tampered = initData.replace('999001', '999002');

    expect(() => verifyTelegramInitData(tampered, BOT_TOKEN)).toThrow(/signature|user/i);
  });

  it('rejects data signed with a different bot token', () => {
    const initData = signInitData(validFields(), '999999999:zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz');

    expect(() => verifyTelegramInitData(initData, BOT_TOKEN)).toThrow('Invalid Telegram signature');
  });

  it('rejects data with no hash', () => {
    expect(() => verifyTelegramInitData('user=%7B%7D&auth_date=1', BOT_TOKEN)).toThrow(
      'Missing Telegram hash'
    );
  });

  it('rejects an expired auth_date', () => {
    const initData = signInitData(
      validFields({ auth_date: String(Math.floor(Date.now() / 1000) - 7200) })
    );

    expect(() => verifyTelegramInitData(initData, BOT_TOKEN)).toThrow('Expired Telegram initData');
  });

  it('honours a shortened maxAgeSeconds', () => {
    const initData = signInitData(
      validFields({ auth_date: String(Math.floor(Date.now() / 1000) - 900) })
    );

    // Still inside the one hour default, but outside the tighter window the
    // order route now uses.
    expect(() => verifyTelegramInitData(initData, BOT_TOKEN)).not.toThrow();
    expect(() => verifyTelegramInitData(initData, BOT_TOKEN, { maxAgeSeconds: 600 })).toThrow(
      'Expired Telegram initData'
    );
  });

  it('rejects an auth_date from the future', () => {
    const initData = signInitData(
      validFields({ auth_date: String(Math.floor(Date.now() / 1000) + 600) })
    );

    expect(() => verifyTelegramInitData(initData, BOT_TOKEN)).toThrow('Expired Telegram initData');
  });

  it('rejects a missing user', () => {
    const fields = validFields();
    delete fields.user;

    expect(() => verifyTelegramInitData(signInitData(fields), BOT_TOKEN)).toThrow(
      'Missing Telegram user'
    );
  });

  it('rejects a non-string initData', () => {
    expect(() => verifyTelegramInitData(null, BOT_TOKEN)).toThrow('Missing Telegram initData');
  });
});
