import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// public/shop-hours.js is a classic script (it runs before app.js in the page),
// so it cannot be imported. It is side-effect free apart from assigning the
// namespace, which makes evaluating it here safe.
const sandbox = {};
new Function(
  'window',
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'shop-hours.js'),
    'utf8'
  )
)(sandbox);
const { isShopOpen, shopMinutesNow } = sandbox.ShopHours;

describe('isShopOpen', () => {
  const HOURS = { opensAt: '07:00', closesAt: '17:00' };

  it.each([
    ['ngay khi mở cửa', 7 * 60, true],
    ['giữa ca', 12 * 60, true],
    ['một phút trước khi đóng', 16 * 60 + 59, true],
    ['đúng giờ đóng cửa', 17 * 60, false],
    ['một phút trước khi mở', 6 * 60 + 59, false],
    ['nửa đêm', 0, false]
  ])('%s -> %s', (_label, nowMinutes, expected) => {
    expect(isShopOpen({ ...HOURS, nowMinutes })).toBe(expected);
  });

  it('handles a shift that runs past midnight', () => {
    const night = { opensAt: '18:00', closesAt: '02:00' };
    expect(isShopOpen({ ...night, nowMinutes: 23 * 60 })).toBe(true);
    expect(isShopOpen({ ...night, nowMinutes: 1 * 60 })).toBe(true);
    expect(isShopOpen({ ...night, nowMinutes: 3 * 60 })).toBe(false);
    expect(isShopOpen({ ...night, nowMinutes: 12 * 60 })).toBe(false);
  });

  it('returns null instead of guessing when hours are missing', () => {
    // The badge previously said "Đang mở cửa" unconditionally. Returning null
    // lets the caller hide the badge rather than make a claim it cannot back.
    expect(isShopOpen({ opensAt: undefined, closesAt: '17:00', nowMinutes: 600 })).toBeNull();
    expect(isShopOpen({ opensAt: '07:00', closesAt: 'bad', nowMinutes: 600 })).toBeNull();
    expect(isShopOpen({ ...HOURS, nowMinutes: null })).toBeNull();
  });
});

describe('shopMinutesNow', () => {
  it('reads the clock in the shop timezone, not the local one', () => {
    // 16:38 UTC is 22:08 in Colombo (UTC+05:30).
    const at = new Date('2026-07-20T16:38:00Z');
    expect(shopMinutesNow('Asia/Colombo', at)).toBe(22 * 60 + 8);
    expect(shopMinutesNow('UTC', at)).toBe(16 * 60 + 38);
  });

  it('places a Colombo shopper outside opening hours late at night', () => {
    // 20:00 UTC = 01:30 next day in Colombo, well after the 17:00 close.
    const at = new Date('2026-07-20T20:00:00Z');
    const open = isShopOpen({
      opensAt: '07:00',
      closesAt: '17:00',
      nowMinutes: shopMinutesNow('Asia/Colombo', at)
    });
    expect(open).toBe(false);
  });
});
