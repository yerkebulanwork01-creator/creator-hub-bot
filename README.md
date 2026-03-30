# 🎓 Creator Hub Bot

Telegram Mini App — қатысушыларды тіркеу, QR арқылы чек-ин/чек-аут, баллдар жүйесі.

## Не істейді

**Қатысушы:** Telegram-да мини-қосымшаны ашады → QR-ды көрсетеді → баллдар жинайды → грейд алады

**Админ:** QR сканерлейді → кіру/шығу белгілейді → отчёт көреді → хабарлама жібереді

## Стек
- Backend: Node.js + Express + Prisma + PostgreSQL
- Bot: grammY
- Mini App: React + Vite
- QR: Динамикалық (HMAC-SHA256, 45 сек)

## Толық нұсқаулық
📖 **[docs/SETUP.md](docs/SETUP.md)** — қадам-қадам орнату

## Жылдам старт

```bash
# 1. Backend
cd backend
cp .env.example .env   # Толтырыңыз!
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev

# 2. Mini App (жаңа терминал)
cd mini-app
npm install
npm run dev
```

## Файл құрылымы
```
creator-hub-bot/
├── backend/           # Сервер + бот
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── middleware/ # Auth
│   │   ├── utils/     # QR, Telegram auth
│   │   ├── bot.js     # Telegram бот
│   │   └── index.js   # Entry point
│   └── prisma/        # БД схемасы + seed
├── mini-app/          # Telegram Mini App
│   └── src/
│       ├── App.jsx    # Барлық беттер
│       └── utils/     # API клиент
├── docs/              # Нұсқаулық + CSV үлгі
├── railway.json       # Railway deploy
└── vercel.json        # Vercel deploy
```

## API эндпоинттар
| Метод | URL | Сипаттама |
|-------|-----|-----------|
| POST | /api/auth/telegram | Telegram арқылы кіру |
| POST | /api/auth/link | Аккаунт привязкасы |
| GET | /api/participants/me | Профиль |
| POST | /api/qr/generate | QR құру |
| POST | /api/qr/verify | QR тексеру (админ) |
| POST | /api/attendance/scan | Чек-ин/чек-аут |
| GET | /api/attendance/event/:id | Отчёт |
| POST | /api/admin/import | CSV импорт |
| POST | /api/admin/broadcast | Рассылка |
| GET | /api/admin/dashboard | Сводка |
