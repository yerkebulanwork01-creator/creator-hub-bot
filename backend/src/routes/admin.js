import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired, adminRequired, superadminRequired } from '../middleware/auth.js';
import { parse } from 'csv-parse/sync';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Dashboard ───────────────────────────────────────────────
router.get('/dashboard', authRequired, adminRequired, async (req, res) => {
  try {
    const [totalP, linkedP, totalE, activeE, todayScans] = await Promise.all([
      prisma.participant.count(),
      prisma.participant.count({ where: { isLinked: true } }),
      prisma.event.count(),
      prisma.event.count({ where: { isActive: true } }),
      prisma.attendanceLog.count({
        where: { scannedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    res.json({ totalParticipants: totalP, linkedParticipants: linkedP, totalEvents: totalE, activeEvents: activeE, todayScans });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard қатесі' });
  }
});

// ─── Мероприятиелер ──────────────────────────────────────────
router.get('/events', authRequired, adminRequired, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startAt: 'desc' },
      include: { _count: { select: { enrollments: true, attendanceLogs: true } } },
    });
    res.json({
      events: events.map(e => ({
        ...e, enrolledCount: e._count.enrollments, scansCount: e._count.attendanceLogs,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

router.post('/events', authRequired, superadminRequired, async (req, res) => {
  try {
    const { title, type, startAt, endAt, placeName } = req.body;
    if (!title || !startAt || !endAt) return res.status(400).json({ error: 'title, startAt, endAt қажет' });

    const event = await prisma.event.create({
      data: {
        title,
        type: type || 'OFFLINE',
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        placeName: placeName || null,
      },
    });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: 'Мероприятие құру қатесі' });
  }
});

// ─── CSV Импорт ──────────────────────────────────────────────
// CSV формат: registration_id,first_name,last_name,phone,cohort,city,program_name
router.post('/import', authRequired, superadminRequired, upload.single('file'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'CSV файл жүктеңіз' });

    const records = parse(req.file.buffer.toString('utf-8'), {
      columns: true, skip_empty_lines: true, trim: true,
    });

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of records) {
      try {
        const regId = row.registration_id?.trim();
        if (!regId) { results.skipped++; continue; }

        const existing = await prisma.participant.findUnique({ where: { externalRegistrationId: regId } });
        if (existing) { results.skipped++; continue; }

        const user = await prisma.user.create({
          data: {
            telegramId: BigInt(0),
            firstName: row.first_name || 'Қатысушы',
            lastName: row.last_name || null,
            phone: row.phone || null,
            participant: {
              create: {
                externalRegistrationId: regId,
                cohort: row.cohort || null,
                city: row.city || null,
                programName: row.program_name || null,
              },
            },
          },
          include: { participant: true },
        });

        if (eventId && user.participant) {
          await prisma.enrollment.create({
            data: { participantId: user.participant.id, eventId },
          });
        }
        results.created++;
      } catch (rowErr) {
        results.errors.push(`${row.registration_id}: ${rowErr.message}`);
      }
    }

    res.json({ message: `Жасалды: ${results.created}, өткізілді: ${results.skipped}`, ...results });
  } catch (err) {
    console.error('Import:', err);
    res.status(500).json({ error: 'Импорт қатесі' });
  }
});

// ─── Қатысушылар тізімі ─────────────────────────────────────
router.get('/participants', authRequired, adminRequired, async (req, res) => {
  try {
    const { eventId, search } = req.query;
    const where = {};
    if (eventId) where.enrollments = { some: { eventId } };
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const participants = await prisma.participant.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    res.json({
      participants: participants.map(p => ({
        id: p.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        phone: p.user.phone,
        registrationId: p.externalRegistrationId,
        cohort: p.cohort,
        city: p.city,
        isLinked: p.isLinked,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

// ─── Рөлді өзгерту ──────────────────────────────────────────
router.post('/set-role', authRequired, superadminRequired, async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!['PARTICIPANT', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Жарамсыз рөл' });
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { role } });
    res.json({ user: { ...user, telegramId: Number(user.telegramId) } });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

// ─── Рассылка (бұқаралық хабарлама) ─────────────────────────
router.post('/broadcast', authRequired, superadminRequired, async (req, res) => {
  try {
    const { message, eventId, city, cohort } = req.body;
    if (!message) return res.status(400).json({ error: 'message қажет' });

    // Фильтр бойынша қатысушыларды табу
    const where = { isLinked: true, user: { telegramId: { not: BigInt(0) } } };
    if (eventId) where.enrollments = { some: { eventId } };
    if (city) where.city = city;
    if (cohort) where.cohort = cohort;

    const participants = await prisma.participant.findMany({
      where,
      include: { user: true },
    });

    // Хабарламаларды кезекке қою (бот жібереді)
    const notifications = [];
    for (const p of participants) {
      if (Number(p.user.telegramId) === 0) continue;
      notifications.push({
        userId: p.user.id,
        message,
      });
    }

    await prisma.notification.createMany({ data: notifications });

    res.json({
      sent: notifications.length,
      message: `${notifications.length} адамға хабарлама кезекке қойылды`,
    });
  } catch (err) {
    console.error('Broadcast:', err);
    res.status(500).json({ error: 'Рассылка қатесі' });
  }
});

// ─── Мерч басқару ────────────────────────────────────────────
router.get('/rewards', authRequired, adminRequired, async (req, res) => {
  const rewards = await prisma.reward.findMany({ orderBy: { pointsCost: 'asc' } });
  res.json({ rewards });
});

router.post('/rewards', authRequired, superadminRequired, async (req, res) => {
  const { title, pointsCost, stock } = req.body;
  const reward = await prisma.reward.create({
    data: { title, pointsCost: parseInt(pointsCost), stock: parseInt(stock || 0) },
  });
  res.json({ reward });
});

export default router;
