# Creator Hub Bot — Орнату нұсқаулығы

## Бұл не?
Telegram Mini App арқылы жұмыс жасайтын қатысушыларды тіркеу жүйесі.
- Қатысушы: QR көрсетеді, баллдар жинайды
- Админ: QR сканерлейді, отчёт көреді
- Суперадмин: мероприятие құрады, CSV жүктейді, рассылка жасайды

## 1-ҚАДАМ: Telegram бот құру (5 минут)

1. Telegram-да @BotFather деп ізде
2. `/newbot` жібер
3. Бот атауы: `Creator Hub Bot`
4. Username: `creator_hub_bot` (бос болуы керек, басқа таңда)
5. BotFather саған **токен** береді — көшір, сақта

Мысалы: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 2-ҚАДАМ: GitHub-қа код жүктеу (10 минут)

1. https://github.com — аккаунт аш (Google-мен кіруге болады)
2. Жаңа repository жаса: `creator-hub-bot`
3. Мен берген файлдарды жүкте

## 3-ҚАДАМ: Railway-да сервер құру (15 минут)

1. https://railway.app — GitHub аккаунтпен кір
2. "New Project" → "Deploy from GitHub repo"
3. `creator-hub-bot` репозиторийді таңда
4. Railway автоматты deploy жасайды

### PostgreSQL қосу:
1. Railway dashboard-та "+ New" → "Database" → "PostgreSQL"
2. PostgreSQL карточкасын бас → "Connect" табы
3. `DATABASE_URL` көшір

### Environment Variables орнату:
Railway dashboard → серверің → "Variables" табы:

```
BOT_TOKEN=7123456789:AAHxxxxxxx (BotFather берген токен)
DATABASE_URL=postgresql://... (Railway берген URL)
MINI_APP_URL=https://creator-hub.vercel.app (кейін өзгертесің)
JWT_SECRET=kez-kelgen-uzyn-random-text-32-simvol-minimum
QR_SECRET=tagi-basqa-random-text-32-simvol
SUPERADMIN_IDS=12345678 (өзіңнің Telegram ID)
PORT=3000
NODE_ENV=production
```

### Өз Telegram ID-ді қалай білу:
@userinfobot деп ізде Telegram-да, /start бас — ID көрсетеді.

## 4-ҚАДАМ: Vercel-де Mini App орнату (10 минут)

1. https://vercel.com — GitHub аккаунтпен кір
2. "Import Project" → `creator-hub-bot` репо
3. Root Directory: `mini-app` деп жаз
4. Framework Preset: `Vite`
5. Environment Variables:
   ```
   VITE_API_URL=https://your-railway-server.up.railway.app
   ```
6. "Deploy" бас

## 5-ҚАДАМ: Бот пен Mini App-ты байланыстыру (5 минут)

1. @BotFather-ге бар
2. `/mybots` → Creator Hub Bot → Bot Settings → Menu Button
3. URL: Vercel берген URL (мыс: https://creator-hub.vercel.app)
4. Button text: `📱 Ашу`

Сонымен қатар:
- `/mybots` → Bot Settings → Domain → Vercel URL-ді қос

## 6-ҚАДАМ: База данных-ты инициализациялау

Railway dashboard → серверің → "Settings" табы:
- Start Command: `npx prisma migrate deploy && node src/index.js`

Немесе Railway Shell арқылы:
```
npx prisma migrate deploy
node prisma/seed.js
```

## 7-ҚАДАМ: Тексеру

1. Telegram-да өз ботыңды ізде
2. /start бас
3. "Ашу" батырмасын бас
4. Mini App ашылуы керек
5. Профиль көрінуі керек

## Проблемалар болса:

| Проблема | Шешім |
|----------|-------|
| Mini App ашылмайды | BotFather-де URL дұрыс па тексер |
| "Ошибка авторизации" | BOT_TOKEN дұрыс па тексер |
| База қосылмайды | DATABASE_URL дұрыс па тексер |
| 500 error | Railway Logs-ты қара |

Әр қадамда қиналсаң — маған жаз, көмектесемін.
