import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Деректерді жүктеу...');

  // Ескі тест деректерді өшіру
  await prisma.enrollment.deleteMany({});
  await prisma.pointsLedger.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  await prisma.rewardRedemption.deleteMany({});
  await prisma.testResult.deleteMany({});
  await prisma.participant.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.reward.deleteMany({});

  const event = await prisma.event.create({
    data: {
      title: 'Креативті индустриялар — 1-модуль',
      type: 'OFFLINE',
      startAt: new Date('2026-05-01T09:00:00'),
      endAt: new Date('2026-05-01T18:00:00'),
      placeName: 'Astana Hub, A залы',
    },
  });
  console.log('✅ Мероприятие:', event.title);

  const people = [
    { regId: 'CH-001', first: 'Айдос', last: 'Қасымов', city: 'Астана', cohort: '1-поток', tgId: 100001 },
    { regId: 'CH-002', first: 'Дана', last: 'Нұрланова', city: 'Алматы', cohort: '1-поток', tgId: 100002 },
    { regId: 'CH-003', first: 'Болат', last: 'Серіков', city: 'Шымкент', cohort: '2-поток', tgId: 100003 },
    { regId: 'CH-004', first: 'Әсел', last: 'Мұхаметова', city: 'Қарағанды', cohort: '2-поток', tgId: 100004 },
    { regId: 'CH-005', first: 'Тимур', last: 'Жансугуров', city: 'Ақтау', cohort: '1-поток', tgId: 100005 },
  ];

  for (const p of people) {
    const user = await prisma.user.create({
      data: {
        telegramId: BigInt(p.tgId),
        firstName: p.first,
        lastName: p.last,
        participant: {
          create: {
            externalRegistrationId: p.regId,
            cohort: p.cohort,
            city: p.city,
            programName: 'Креативті индустриялар',
          },
        },
      },
      include: { participant: true },
    });

    await prisma.enrollment.create({
      data: { participantId: user.participant.id, eventId: event.id },
    });
    console.log('  + ' + p.first + ' ' + p.last + ' (' + p.regId + ')');
  }

  await prisma.reward.createMany({
    data: [
      { title: 'Стикерпак', pointsCost: 20, stock: 200 },
      { title: 'Футболка', pointsCost: 100, stock: 50 },
      { title: 'Худи', pointsCost: 200, stock: 20 },
      { title: 'PowerBank', pointsCost: 150, stock: 30 },
    ],
  });
  console.log('✅ Мерч қосылды');
  console.log('🎉 Seed аяқталды!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
