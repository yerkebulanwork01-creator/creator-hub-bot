import crypto from 'crypto';

const QR_SECRET = process.env.QR_SECRET || 'default-qr-secret';
const QR_TTL = 45; // секунд

/**
 * QR payload құру: participantId|eventId|timestamp|expires|nonce|signature
 * 30-45 секундтан кейін жарамсыз болады
 */
export function generateQrPayload(participantId, eventId) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + QR_TTL;

  const data = `${participantId}|${eventId}|${issuedAt}|${expiresAt}|${nonce}`;
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex')
    .substring(0, 16);

  return {
    payload: `${data}|${signature}`,
    expiresAt,
    nonce,
  };
}

/**
 * QR payload тексеру — подпись, мерзім, формат
 */
export function verifyQrPayload(payload) {
  try {
    const parts = payload.split('|');
    if (parts.length !== 6) {
      return { valid: false, error: 'QR форматы дұрыс емес' };
    }

    const [participantId, eventId, issuedAt, expiresAt, nonce, signature] = parts;

    // Мерзімі өтті ме
    if (Math.floor(Date.now() / 1000) > parseInt(expiresAt)) {
      return { valid: false, error: 'QR мерзімі аяқталды. Жаңартуды сұраңыз.' };
    }

    // Подпись тексеру
    const data = `${participantId}|${eventId}|${issuedAt}|${expiresAt}|${nonce}`;
    const expected = crypto
      .createHmac('sha256', QR_SECRET)
      .update(data)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expected) {
      return { valid: false, error: 'QR қолтаңбасы жарамсыз' };
    }

    return { valid: true, participantId, eventId, nonce };
  } catch {
    return { valid: false, error: 'QR тексеру қатесі' };
  }
}
