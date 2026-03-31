import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateInitData } from '../utils/telegram-auth.js';
import { createToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const SUPERADMIN_IDS = (process.env.SUPERADMIN_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(Boolean);

// POST /api/auth/telegram — Telegram арқылы кіру
router.post('/telegram', async (req, res) => {
  try {
    console.log('TELEGRAM AUTH BODY:', req.body);

    const { initData } = req.body;
    if (!initData) {
      console.log('TELEGRAM AUTH ERROR: initData missing');
      return res.status(400).json({ error: 'initData қажет' });
    }

    const v = validateInitData(initData);
    console.log('TELEGRAM AUTH VALIDATE:', v);

    if (!v.valid) {
      return res.status(401).json({ error: v.error || 'Telegram auth жарамсыз' });
    }

    const telegramId = BigInt(v.user.id);
    const isSuperadmin = SUPERADMIN_IDS.includes(Number(v.user.id));

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

    return res.json({
      token,
      user: {
        ...user,
        telegramId: Number(user.telegramId),
      },
    });
  } catch (err) {
    console.error('AUTH TELEGRAM FATAL:', err);
    return res.status(500).json({ error: 'Авторизация қатесі' });
  }
});

// POST /api/auth/link — Регистрация кодымен привязка
router.post('/link', async (req, res) => {
  try {
    console.log('LINK AUTH BODY:', req.body);

    const { initData, registrationId } = req.body;
    if (!initData || !registrationId) {
      console.log('LINK AUTH ERROR: initData or registrationId missing');
      return res.status(400).json({ error: 'initData және registrationId қажет' });
    }

    const v = validateInitData(initData);
    console.log('LINK AUTH VALIDATE:', v);

    if (!v.valid) {
      return res.status(401).json({ error: v.error || 'Telegram auth жарамсыз' });
    }

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

    return res.json({
      token,
      user: {
        ...user,
        telegramId: Number(user.telegramId),
      },
      participant,
    });
  } catch (err) {
    console.error('AUTH LINK FATAL:', err);
    return res.status(500).json({ error: 'Привязка қатесі' });
  }
});

export default router;
