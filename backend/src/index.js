import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createBot, startNotificationSender } from './bot.js';
import authRoutes from './routes/auth.js';
import qrRoutes from './routes/qr.js';
import attendanceRoutes from './routes/attendance.js';
import participantRoutes from './routes/participants.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.MINI_APP_URL || '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', bot: 'Creator Hub Bot', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.use((_, res) => res.status(404).json({ error: 'Endpoint табылмады' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Сервер қатесі' });
});

// Start
async function start() {
  if (process.env.BOT_TOKEN) {
    const bot = createBot(process.env.BOT_TOKEN);
    bot.start();
    startNotificationSender(bot);
    console.log('🤖 Creator Hub Bot іске қосылды');
  } else {
    console.warn('⚠️  BOT_TOKEN жоқ — бот іске қосылмады');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Сервер: http://localhost:${PORT}`);
  });
}

start().catch(console.error);
