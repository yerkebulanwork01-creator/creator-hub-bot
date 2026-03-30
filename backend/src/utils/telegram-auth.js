import crypto from 'crypto';

/**
 * Telegram Mini App initData тексеру
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initDataRaw) {
  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) return { valid: false, error: 'BOT_TOKEN жоқ' };

    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return { valid: false, error: 'hash жоқ' };

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false, error: 'Қолтаңба сәйкес емес' };
    }

    // 1 сағаттан ескі болмауы керек
    const authDate = parseInt(params.get('auth_date') || '0');
    if (Math.floor(Date.now() / 1000) - authDate > 3600) {
      return { valid: false, error: 'Деректер ескірген' };
    }

    const userStr = params.get('user');
    if (!userStr) return { valid: false, error: 'User деректері жоқ' };

    const user = JSON.parse(userStr);
    return {
      valid: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name || null,
        username: user.username || null,
      },
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
