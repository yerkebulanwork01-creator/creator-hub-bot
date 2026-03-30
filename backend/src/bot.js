import { Bot, InlineKeyboard } from 'grammy';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function createBot(token) {
  const bot = new Bot(token);
  const MINI_APP_URL = process.env.MINI_APP_URL || 'https://example.com';

  // /start
  bot.command('start', async (ctx) => {
    const kb = new InlineKeyboard().webApp('📱 Қосымшаны ашу', MINI_APP_URL);
    await ctx.reply(
      '👋 Creator Hub Bot-қа қош келдіңіз!\n\n' +
      '📱 Төмендегі батырманы басып қосымшаны ашыңыз:\n' +
      '• Профиль көру\n' +
      '• QR-код көрсету\n' +
      '• Баллдар мен грейд\n\n' +
      'Админ болсаңыз — сканер режимі автоматты қосылады.',
      { reply_markup: kb }
    );
  });

  // /help
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📋 Қалай пайдалану:\n\n' +
      '1. «Қосымшаны ашу» батырмасын басыңыз\n' +
      '2. Тіркеу кодын енгізіп аккаунтты байланыстырыңыз\n' +
      '3. Мероприятиеде QR-кодыңызды көрсетіңіз\n' +
      '4. Баллдарыңызды қосымшада бақылаңыз\n\n' +
      '❓ Көмек: /support'
    );
  });

  // /qr
  bot.command('qr', async (ctx) => {
    const kb = new InlineKeyboard().webApp('🔲 QR көрсету', `${MINI_APP_URL}?page=qr`);
    await ctx.reply('QR-кодыңызды көрсету үшін батырманы басыңыз:', { reply_markup: kb });
  });

  // /support
  bot.command('support', async (ctx) => {
    await ctx.reply(
      '📞 Көмек:\n' +
      '• QR ашылмайды → қосымшаны қайта ашыңыз\n' +
      '• Баллдар жоқ → админге хабарласыңыз\n' +
      '• Басқа мәселе → осында жазыңыз'
    );
  });

  // Кез келген текст
  bot.on('message:text', async (ctx) => {
    const kb = new InlineKeyboard().webApp('📱 Қосымшаны ашу', MINI_APP_URL);
    await ctx.reply('Қосымшаны пайдаланыңыз 👇', { reply_markup: kb });
  });

  bot.catch((err) => console.error('Bot error:', err));

  return bot;
}

/**
 * Жіберілмеген хабарламаларды жіберу (әр 30 секунд)
 */
export async function startNotificationSender(bot) {
  setInterval(async () => {
    try {
      const pending = await prisma.notification.findMany({
        where: { isRead: false },
        include: { user: true },
        take: 20,
      });

      for (const notif of pending) {
        try {
          const tgId = Number(notif.user.telegramId);
          if (tgId === 0) continue;

          await bot.api.sendMessage(tgId, notif.message);
          await prisma.notification.update({
            where: { id: notif.id },
            data: { isRead: true },
          });
        } catch (sendErr) {
          console.error(`Notification send failed for ${notif.userId}:`, sendErr.message);
        }
      }
    } catch (err) {
      console.error('Notification sender error:', err);
    }
  }, 30000); // 30 секунд сайын
}
