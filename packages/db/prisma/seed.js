/**
 * Dev seed — rebuilds the standard test dataset from scratch.
 *
 * Idempotent: upserts by unique keys, so it can run repeatedly.
 * Run with: pnpm --filter @nailbook/db seed
 *
 * Creates:
 *  - Provider account (Clerk user justiceheughan16@gmail.com → injusstice-nails)
 *  - 3 services with deposits, Mon–Fri 9–5 availability
 *  - Test client Maya Johnson with a ProviderClient record
 *  - 3 appointments (completed yesterday, confirmed tomorrow, confirmed +3 days)
 *    with event-sourced AppointmentEvents and payments per the architecture
 *    invariants (every appointment has events; money is logged as Payments).
 *
 * All times are wall-clock America/New_York converted to real UTC.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TZ = "America/New_York";
const CLERK_ID = "user_39YbV5QrKSAjQOZNUS9RWhUjX0J";
const PROVIDER_EMAIL = "justiceheughan16@gmail.com";
const SLUG = "injusstice-nails";

/** Convert a wall-clock time in TZ on a given date to a real UTC Date. */
function wallClockToUTC(date, hour, minute) {
  // Ask Intl what the UTC offset is for that date in TZ, then apply it.
  const guess = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute));
  const inTz = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() + (asUtc.getTime() - inTz.getTime()));
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  // ── Provider user + provider ────────────────────────────────
  const providerUser = await prisma.user.upsert({
    where: { clerkId: CLERK_ID },
    update: { role: "PROVIDER" },
    create: {
      clerkId: CLERK_ID,
      email: PROVIDER_EMAIL,
      firstName: "Justice",
      lastName: "Heughan",
      role: "PROVIDER",
    },
  });

  const provider = await prisma.provider.upsert({
    where: { slug: SLUG },
    update: {},
    create: {
      userId: providerUser.id,
      slug: SLUG,
      businessName: "Injusstice Nails",
      bio: "Editorial nail artistry. Gel, sculpture, and hand-painted art in a calm private studio.",
      category: "NAILS",
      timezone: TZ,
      acceptsCard: true,
      acceptsCash: true,
      instantBook: true,
      onboardedAt: new Date(),
    },
  });

  // ── Services ────────────────────────────────────────────────
  const serviceSpecs = [
    { name: "Classic Manicure", priceInCents: 4500, durationMinutes: 45, depositType: "PERCENT", depositValue: 20, sortOrder: 0, description: "Shape, cuticle care, and polish. Clean and quick." },
    { name: "Gel Full Set", priceInCents: 8500, durationMinutes: 90, depositType: "PERCENT", depositValue: 25, sortOrder: 1, description: "Full gel application with structured apex. Lasts 3 to 4 weeks." },
    { name: "Nail Art Design", priceInCents: 12000, durationMinutes: 120, depositType: "FLAT", depositValue: 3000, sortOrder: 2, description: "Hand-painted custom art. Bring inspiration photos." },
  ];
  const services = [];
  for (const spec of serviceSpecs) {
    const existing = await prisma.service.findFirst({
      where: { providerId: provider.id, name: spec.name },
    });
    services.push(
      existing ??
        (await prisma.service.create({ data: { providerId: provider.id, ...spec } })),
    );
  }

  // ── Availability: Mon–Fri 9–5 ───────────────────────────────
  for (let day = 1; day <= 5; day++) {
    const existing = await prisma.availabilityRule.findFirst({
      where: { providerId: provider.id, dayOfWeek: day },
    });
    if (!existing) {
      await prisma.availabilityRule.create({
        data: { providerId: provider.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
      });
    }
  }

  // ── Test client ─────────────────────────────────────────────
  const client = await prisma.user.upsert({
    where: { email: "maya.johnson.test@example.com" },
    update: {},
    create: {
      clerkId: "seed_client_maya_johnson",
      email: "maya.johnson.test@example.com",
      firstName: "Maya",
      lastName: "Johnson",
      phone: "+15550100200",
      role: "CLIENT",
    },
  });

  const providerClient = await prisma.providerClient.upsert({
    where: { providerId_email: { providerId: provider.id, email: client.email } },
    update: {},
    create: {
      providerId: provider.id,
      email: client.email,
      name: "Maya Johnson",
      phone: client.phone,
      notes: "Prefers almond shape. Sensitive cuticles.",
    },
  });

  // ── Appointments (skip if any already exist — times move daily) ──
  const existingCount = await prisma.appointment.count({ where: { providerId: provider.id } });
  if (existingCount > 0) {
    console.log(`Appointments already present (${existingCount}) — skipping appointment seed.`);
    return { provider, services };
  }

  const shared = {
    providerId: provider.id,
    clientId: client.id,
    providerClientId: providerClient.id,
    clientName: "Maya Johnson",
    clientEmail: client.email,
    clientPhone: client.phone,
  };

  async function makeAppointment({ service, date, startHour, status, events, payments }) {
    const start = wallClockToUTC(date, startHour, 0);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);
    const deposit =
      service.depositType === "PERCENT"
        ? Math.round((service.priceInCents * service.depositValue) / 100)
        : service.depositValue;
    const appt = await prisma.appointment.create({
      data: {
        ...shared,
        serviceId: service.id,
        status,
        startTime: start,
        endTime: end,
        totalInCents: service.priceInCents,
        depositInCents: deposit,
      },
    });
    for (const type of events) {
      await prisma.appointmentEvent.create({
        data: { appointmentId: appt.id, type, actorType: "system", metadata: { seed: true } },
      });
    }
    for (const p of payments) {
      await prisma.payment.create({
        data: { providerId: provider.id, appointmentId: appt.id, ...p },
      });
    }
    return appt;
  }

  // Completed yesterday: Gel Full Set, deposit paid by card, balance in cash.
  await makeAppointment({
    service: services[1],
    date: daysFromNow(-1),
    startHour: 10,
    status: "COMPLETED",
    events: ["created", "confirmed", "payment_received", "completed"],
    payments: [
      { amountInCents: Math.round(8500 * 0.25), type: "DEPOSIT", status: "COMPLETED", method: "CARD" },
      { amountInCents: 8500 - Math.round(8500 * 0.25), type: "BALANCE", status: "COMPLETED", method: "CASH" },
    ],
  });

  // Confirmed tomorrow: Classic Manicure, deposit completed.
  await makeAppointment({
    service: services[0],
    date: daysFromNow(1),
    startHour: 11,
    status: "CONFIRMED",
    events: ["created", "confirmed", "payment_received"],
    payments: [
      { amountInCents: Math.round(4500 * 0.2), type: "DEPOSIT", status: "COMPLETED", method: "CARD" },
    ],
  });

  // Confirmed +3 days: Nail Art Design, deposit still pending.
  await makeAppointment({
    service: services[2],
    date: daysFromNow(3),
    startHour: 13,
    status: "CONFIRMED",
    events: ["created", "confirmed"],
    payments: [
      { amountInCents: 3000, type: "DEPOSIT", status: "PENDING", method: "CARD" },
    ],
  });

  return { provider, services };
}

main()
  .then(async ({ provider }) => {
    const counts = {
      users: await prisma.user.count(),
      services: await prisma.service.count(),
      rules: await prisma.availabilityRule.count(),
      appointments: await prisma.appointment.count(),
      payments: await prisma.payment.count(),
      events: await prisma.appointmentEvent.count(),
    };
    console.log(`Seeded provider ${provider.slug} (${provider.id})`);
    console.log(counts);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
