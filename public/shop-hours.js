// Loaded as a classic script before app.js, so it must not use module syntax.
// Kept in its own file, free of side effects, so the logic can be exercised in
// tests without booting the whole Mini App.
(function attachShopHours(global) {
  function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  }

  /**
   * @returns {boolean|null} null when the hours are unknown — the caller must
   * then say nothing rather than claim the shop is open.
   */
  function isShopOpen({ opensAt, closesAt, nowMinutes }) {
    const open = toMinutes(opensAt);
    const close = toMinutes(closesAt);
    if (open === null || close === null || typeof nowMinutes !== 'number') return null;
    // A shift that ends past midnight wraps, so the comparison has to flip.
    return open <= close
      ? nowMinutes >= open && nowMinutes < close
      : nowMinutes >= open || nowMinutes < close;
  }

  /** Minutes since midnight on the shop's clock, not the customer's. */
  function shopMinutesNow(timezone, now) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now || new Date());
    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    const h = get('hour');
    const m = get('minute');
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  }

  global.ShopHours = { isShopOpen, shopMinutesNow, toMinutes };
})(typeof window !== 'undefined' ? window : globalThis);
