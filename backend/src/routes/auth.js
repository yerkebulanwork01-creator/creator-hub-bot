import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateInitData } from '../utils/telegram-auth.js';
import { createToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const SUPERADMIN_IDS = (process.env.SUPERADMIN_IDS || '')
  .split(',').map(id => parseInt(id.trim())).filter(Boolean);

// POST /api/auth/telegram — Telegram кіру
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'initData қажет' });

    const v = validateInitData(initData);
    if (!v.valid) return res.status(401).json({ error: v.error });

    const telegramId = BigInt(v.user.id);
    const isSuperadmin = SUPERADMIN_IDS.includes(v.user.id);

    let user = await prisma.user.findUnique({
      where: { telegramId },
      include: { participant: true },
    });

    if (user) {
      user = await prisma.user.update({
        where: { telegramId },
        data: {
          firstName: v.user.firstName,
          lastName: v.user.lastName,
          username: v.user.username,
          ...(isSuperadmin && { role: 'SUPERADMIN' }),
        },
        include: { participant: true },
      });
      const token = createToken(user);
      return res.json({ token, user: { ...user, telegramId: Number(user.telegramId) } });
    }

    // Жаңа superadmin
    if (isSuperadmin) {
      user = await prisma.user.create({
        data: {
          telegramId, firstName: v.user.firstName, lastName: v.user.lastName,
          username: v.user.username, role: 'SUPERADMIN',
        },
        include: { participant: true },
      });
      const token = createToken(user);
      return res.json({ token, user: { ...user, telegramId: Number(user.telegramId) } });
    }

    // Жаңа адам — тіркелу керек
    return res.json({ token: null, user: null, needsRegistration: true });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Авторизация қатесі' });
  }
});

// POST /api/auth/register — Жаңа қатысушы тіркеу
router.post('/register', async (req, res) => {
  try {
    const { initData, iin, firstName, lastName, phone, city } = req.body;
    if (!initData || !iin || !firstName || !lastName) {
      return res.status(400).json({ error: 'ИИН, аты, тегі міндетті' });
    }

    // ИИН формат тексеру (12 сан)
    if (!/^\d{12}$/.test(iin)) {
      return res.status(400).json({ error: 'ИИН 12 саннан тұруы керек' });
    }

    const v = validateInitData(initData);
    if (!v.valid) return res.status(401).json({ error: v.error });

    const telegramId = BigInt(v.user.id);

    // Бұл ИИН тіркелген бе
    const existingParticipant = await prisma.participant.findUnique({
      where: { externalRegistrationId: iin },
    });
    if (existingParticipant) {
      return res.status(409).json({ error: 'Бұл ИИН-мен тіркелген аккаунт бар' });
    }

    // Бұл Telegram тіркелген бе
    const existingUser = await prisma.user.findUnique({ where: { telegramId } });
    if (existingUser) {
      return res.status(409).json({ error: 'Сіз бұрын тіркелгенсіз' });
    }

    // Жаңа user + participant құру
    const user = await prisma.user.create({
      data: {
        telegramId,
        firstName,
        lastName,
        phone: phone || null,
        username: v.user.username,
        role: 'PARTICIPANT',
        participant: {
          create: {
            externalRegistrationId: iin,
            city: city || null,
            programName: 'Creator Hub',
            isLinked: true,
          },
        },
      },
      include: { participant: true },
    });

    const token = createToken(user);
    res.json({
      token,
      user: { ...user, telegramId: Number(user.telegramId) },
      participant: user.participant,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Тіркелу қатесі' });
  }
});

export default router;
