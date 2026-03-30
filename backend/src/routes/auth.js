import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateInitData } from '../utils/telegram-auth.js';
import { createToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const SUPERADMIN_IDS = (process.env.SUPERADMIN_IDS || '')
  .split(',').map(id => parseInt(id.trim())).filter(Boolean);

// POST /api/auth/telegram — Telegram арқылы кіру
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

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          firstName: v.user.firstName,
          lastName: v.user.lastName,
          username: v.user.username,
          role: isSuperadmin ? 'SUPERADMIN' : 'PARTICIPANT',
        },
        include: { participant: true },
      });
    } else {
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
    }

    const token = createToken(user);
    res.json({
      token,
      user: { ...user, telegramId: Number(user.telegramId) },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Авторизация қатесі' });
  }
});

// POST /api/auth/link — Регистрация кодымен привязка
router.post('/link', async (req, res) => {
  try {
    const { initData, registrationId } = req.body;
    if (!initData || !registrationId) {
      return res.status(400).json({ error: 'initData және registrationId қажет' });
    }

    const v = validateInitData(initData);
    if (!v.valid) return res.status(401).json({ error: v.error });

    const participant = await prisma.participant.findUnique({
      where: { externalRegistrationId: registrationId.trim() },
      include: { user: true },
    });

    if (!participant) {
      return res.status(404).json({ error: 'Код табылмады. Тексеріңіз.' });
    }
    if (participant.isLinked) {
      return res.status(409).json({ error: 'Бұл код басқа аккаунтқа тіркелген' });
    }

    const user = await prisma.user.update({
      where: { id: participant.userId },
      data: {
        telegramId: BigInt(v.user.id),
        firstName: v.user.firstName,
        lastName: v.user.lastName,
        username: v.user.username,
      },
    });

    await prisma.participant.update({
      where: { id: participant.id },
      data: { isLinked: true },
    });

    const token = createToken(user);
    res.json({ token, user: { ...user, telegramId: Number(user.telegramId) }, participant });
  } catch (err) {
    console.error('Link error:', err);
    res.status(500).json({ error: 'Привязка қатесі' });
  }
});

export default router;
