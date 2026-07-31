import crypto from 'node:crypto';

function safeEqualHex(a, b) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export function verifyTelegramInitData(initData, botToken, options = {}) {
  const maxAgeSeconds = options.maxAgeSeconds ?? 3600;
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!initData || typeof initData !== 'string') {
    throw new Error('Missing Telegram initData');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw new Error('Missing Telegram hash');

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!safeEqualHex(receivedHash, calculatedHash)) {
    throw new Error('Invalid Telegram signature');
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(authDate)) throw new Error('Invalid Telegram auth_date');
  if (nowSeconds - authDate > maxAgeSeconds || authDate > nowSeconds + 30) {
    throw new Error('Expired Telegram initData');
  }

  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Missing Telegram user');

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch {
    throw new Error('Invalid Telegram user payload');
  }

  if (!Number.isSafeInteger(user.id)) throw new Error('Invalid Telegram user id');
  return user;
}
