import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authRequired } from '../middleware/auth.js';
import { generateQrPayload, verifyQrPayload } from '../utils/qr.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/qr/generate — Қатысушы үшін QR құру
router.post('/generate', authRequired, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId қажет' });

    const participant = await prisma.participant.findFirst({
      where: { userId: req.user.userId },
    });
    if (!participant) return res.status(404).json({ error: 'Сіз қатысушы емессіз' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { participantId_eventId: { participantId: participant.id, eventId } },
    });
    if (!enrollment) return res.status(403).json({ error: 'Сіз бұл мероприятиеге жазылмағансыз' });

    const qr = generateQrPayload(participant.id, eventId);
    res.json({ payload: qr.payload, expiresAt: qr.expiresAt, refreshInMs: 30000 });
  } catch (err) {
    console.error('QR generate:', err);
    res.status(500).json({ error: 'QR құру қатесі' });
  }
});

// POST /api/qr/verify — Админ сканерлегенде QR тексеру
router.post('/verify', authRequired, async (req, res) => {
  try {
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'payload қажет' });

    const result = verifyQrPayload(payload);
    if (!result.valid) return res.status(400).json({ error: result.error });

    // Nonce бұрын қолданылды ма
    const used = await prisma.attendanceLog.findFirst({ where: { qrNonce: result.nonce } });
    if (used) return res.status(409).json({ error: 'Бұл QR қолданылып қойған' });

    const participant = await prisma.participant.findUnique({
      where: { id: result.participantId },
      include: {
        user: true,
        attendanceLogs: {
          where: { eventId: result.eventId },
          orderBy: { scannedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!participant) return res.status(404).json({ error: 'Қатысушы табылмады' });

    const lastLog = participant.attendanceLogs[0];
    const suggestedAction = !lastLog || lastLog.action === 'CHECK_OUT' ? 'CHECK_IN' : 'CHECK_OUT';

    res.json({
      valid: true,
      participant: {
        id: participant.id,
        firstName: participant.user.firstName,
        lastName: participant.user.lastName,
        cohort: participant.cohort,
        city: participant.city,
      },
      eventId: result.eventId,
      nonce: result.nonce,
      suggestedAction,
      lastAction: lastLog?.action || null,
      lastActionAt: lastLog?.scannedAt || null,
    });
  } catch (err) {
    console.error('QR verify:', err);
    res.status(500).json({ error: 'QR тексеру қатесі' });
  }
});

export default router;
