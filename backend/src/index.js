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

app.use(cors({ origin: process.env.MINI_APP_URL || '*', credentials: true }));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ status: 'ok', bot: 'Creator Hub Bot', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);

app.use((_, res) => res.status(404).json({ error: 'Endpoint табылмады' }));

app.listen(PORT, () => {
  console.log('🚀 Сервер: http://localhost:' + PORT);
});

// Бот бөлек іске қосылады, қатесі серверді құлатпайды
if (process.env.BOT_TOKEN) {
  try {
    const bot = createBot(process.env.BOT_TOKEN);
    bot.start({ drop_pending_updates: true }).catch(err => {
      console.error('Bot error (ignored):', err.message);
    });
    startNotificationSender(bot);
    console.log('🤖 Bot іске қосылды');
  } catch (err) {
    console.error('Bot init error (ignored):', err.message);
  }
}
