import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/participants/me — Менің профилім
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        participant: {
          include: {
            enrollments: {
              include: { event: true },
              where: { status: 'ENROLLED' },
            },
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Пайдаланушы табылмады' });

    let totalPoints = 0;
    if (user.participant) {
      const agg = await prisma.pointsLedger.aggregate({
        where: { participantId: user.participant.id },
        _sum: { pointsDelta: true },
      });
      totalPoints = agg._sum.pointsDelta || 0;
    }

    res.json({
      user: { id: user.id, telegramId: Number(user.telegramId), firstName: user.firstName, lastName: user.lastName, role: user.role },
      participant: user.participant ? {
        id: user.participant.id,
        cohort: user.participant.cohort,
        city: user.participant.city,
        programName: user.participant.programName,
        isLinked: user.participant.isLinked,
        totalPoints,
        events: user.participant.enrollments.map(e => ({
          id: e.event.id, title: e.event.title, type: e.event.type,
          startAt: e.event.startAt, endAt: e.event.endAt, placeName: e.event.placeName,
        })),
      } : null,
    });
  } catch (err) {
    console.error('Profile:', err);
    res.status(500).json({ error: 'Профиль қатесі' });
  }
});

// GET /api/participants/me/points — Баллдар тарихы
router.get('/me/points', authRequired, async (req, res) => {
  try {
    const participant = await prisma.participant.findFirst({ where: { userId: req.user.userId } });
    if (!participant) return res.status(404).json({ error: 'Қатысушы емессіз' });

    const history = await prisma.pointsLedger.findMany({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'desc' },
    });
    const total = history.reduce((sum, e) => sum + e.pointsDelta, 0);
    res.json({ total, history });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

// GET /api/participants/me/events — Менің мероприятиелерім
router.get('/me/events', authRequired, async (req, res) => {
  try {
    const participant = await prisma.participant.findFirst({ where: { userId: req.user.userId } });
    if (!participant) return res.status(404).json({ error: 'Қатысушы емессіз' });

    const enrollments = await prisma.enrollment.findMany({
      where: { participantId: participant.id, status: 'ENROLLED' },
      include: { event: true },
      orderBy: { event: { startAt: 'asc' } },
    });

    res.json({
      events: enrollments.map(e => ({
        id: e.event.id, title: e.event.title, type: e.event.type,
        startAt: e.event.startAt, endAt: e.event.endAt, placeName: e.event.placeName,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

export default router;
