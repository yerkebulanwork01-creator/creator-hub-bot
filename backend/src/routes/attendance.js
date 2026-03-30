import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/attendance/scan — Check-in немесе Check-out
router.post('/scan', authRequired, adminRequired, async (req, res) => {
  try {
    const { participantId, eventId, action, nonce } = req.body;
    if (!participantId || !eventId || !action) {
      return res.status(400).json({ error: 'participantId, eventId, action қажет' });
    }
    if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
      return res.status(400).json({ error: 'action: CHECK_IN немесе CHECK_OUT' });
    }

    // Nonce дубликат
    if (nonce) {
      const exists = await prisma.attendanceLog.findFirst({ where: { qrNonce: nonce } });
      if (exists) return res.status(409).json({ error: 'Бұл QR қолданылған' });
    }

    // Enrollment тексеру
    const enrollment = await prisma.enrollment.findUnique({
      where: { participantId_eventId: { participantId, eventId } },
    });
    if (!enrollment) return res.status(404).json({ error: 'Қатысушы жазылмаған' });

    // Логика: қайталанбауы керек
    const lastLog = await prisma.attendanceLog.findFirst({
      where: { participantId, eventId },
      orderBy: { scannedAt: 'desc' },
    });

    if (lastLog?.action === action) {
      const msg = action === 'CHECK_IN'
        ? 'Қатысушы кіріп қойған. Алдымен шығу керек.'
        : 'Қатысушы шығып қойған. Алдымен кіру керек.';
      return res.status(409).json({ error: msg });
    }
    if (!lastLog && action === 'CHECK_OUT') {
      return res.status(400).json({ error: 'Кіріссіз шығу мүмкін емес' });
    }

    // Жазу
    const log = await prisma.attendanceLog.create({
      data: {
        participantId,
        eventId,
        action,
        scannedById: req.user.userId,
        qrNonce: nonce || null,
      },
      include: { participant: { include: { user: true } } },
    });

    // Балл беру (CHECK_IN кезінде)
    if (action === 'CHECK_IN') {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      const lateMin = (Date.now() - new Date(event.startAt).getTime()) / 60000;
      const points = lateMin > 15 ? 5 : 10;
      const reason = lateMin > 15 ? 'Кешігіп келу' : 'Уақытында келу';

      await prisma.pointsLedger.create({
        data: { participantId, reason, pointsDelta: points, sourceType: 'attendance', sourceId: log.id },
      });
    }

    // Толық қатысу баллы (CHECK_OUT кезінде)
    if (action === 'CHECK_OUT' && lastLog?.action === 'CHECK_IN') {
      const durationMin = (Date.now() - new Date(lastLog.scannedAt).getTime()) / 60000;
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      const eventDuration = (new Date(event.endAt) - new Date(event.startAt)) / 60000;

      if (durationMin >= eventDuration * 0.8) {
        await prisma.pointsLedger.create({
          data: { participantId, reason: 'Толық қатысу', pointsDelta: 10, sourceType: 'attendance', sourceId: log.id },
        });
      }
    }

    res.json({
      success: true,
      action: log.action,
      participant: {
        firstName: log.participant.user.firstName,
        lastName: log.participant.user.lastName,
        cohort: log.participant.cohort,
      },
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Сканерлеу қатесі' });
  }
});

// GET /api/attendance/event/:eventId — Мероприятие бойынша отчёт
router.get('/event/:eventId', authRequired, adminRequired, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Мероприятие табылмады' });

    const enrollments = await prisma.enrollment.findMany({
      where: { eventId },
      include: {
        participant: {
          include: {
            user: true,
            attendanceLogs: { where: { eventId }, orderBy: { scannedAt: 'asc' } },
          },
        },
      },
    });

    const participants = enrollments.map(e => {
      const logs = e.participant.attendanceLogs;
      const checkIn = logs.find(l => l.action === 'CHECK_IN');
      const checkOut = logs.find(l => l.action === 'CHECK_OUT');
      const dur = checkIn && checkOut
        ? Math.round((new Date(checkOut.scannedAt) - new Date(checkIn.scannedAt)) / 60000)
        : null;

      return {
        id: e.participant.id,
        firstName: e.participant.user.firstName,
        lastName: e.participant.user.lastName,
        cohort: e.participant.cohort,
        city: e.participant.city,
        checkedIn: !!checkIn,
        checkInAt: checkIn?.scannedAt || null,
        checkedOut: !!checkOut,
        checkOutAt: checkOut?.scannedAt || null,
        durationMin: dur,
        status: !checkIn ? 'absent' : !checkOut ? 'inside' : 'completed',
      };
    });

    const total = participants.length;
    res.json({
      event,
      summary: {
        total,
        present: participants.filter(p => p.checkedIn).length,
        absent: participants.filter(p => !p.checkedIn).length,
        inside: participants.filter(p => p.status === 'inside').length,
      },
      participants,
    });
  } catch (err) {
    console.error('Report:', err);
    res.status(500).json({ error: 'Отчёт қатесі' });
  }
});

// GET /api/attendance/my — Менің посещаемостьым
router.get('/my', authRequired, async (req, res) => {
  try {
    const participant = await prisma.participant.findFirst({ where: { userId: req.user.userId } });
    if (!participant) return res.status(404).json({ error: 'Қатысушы емессіз' });

    const logs = await prisma.attendanceLog.findMany({
      where: { participantId: participant.id },
      include: { event: true },
      orderBy: { scannedAt: 'desc' },
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

export default router;
