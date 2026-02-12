import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test client user
  const clientUser = await prisma.user.upsert({
    where: { email: "client@test.com" },
    update: {},
    create: {
      clerkId: "test_client_001",
      email: "client@test.com",
      firstName: "Maya",
      lastName: "Johnson",
      role: "CLIENT",
    },
  });
  console.log("  Created client user:", clientUser.firstName);

  // Create provider user
  const providerUser = await prisma.user.upsert({
    where: { email: "jasmine@nailbook.test" },
    update: {},
    create: {
      clerkId: "test_provider_001",
      email: "jasmine@nailbook.test",
      firstName: "Jasmine",
      lastName: "Lee",
      role: "PROVIDER",
    },
  });
  console.log("  Created provider user:", providerUser.firstName);

  // Create provider profile
  const provider = await prisma.provider.upsert({
    where: { slug: "jasmine-nails" },
    update: {},
    create: {
      userId: providerUser.id,
      slug: "jasmine-nails",
      businessName: "Nails by Jasmine",
      bio: "Luxury nail artist specializing in custom designs, gel extensions, and nail art. 5+ years experience. Book your next look!",
      locationAddress: "123 Beauty Ave, Los Angeles, CA 90028",
      locationLat: 34.0983,
      locationLng: -118.3267,
      instagramUrl: "https://instagram.com/jasmineenails",
      tiktokUrl: "https://tiktok.com/@jasmineenails",
      isVerified: true,
      acceptsCard: true,
      acceptsApplePay: true,
      acceptsGooglePay: true,
      acceptsCashAppPay: true,
      acceptsCash: true,
      instantBook: true,
      requireInspirationPhoto: false,
      arrivalGraceMinutes: 15,
      cancellationHours: 24,
      noShowFeePercent: 100,
    },
  });
  console.log("  Created provider:", provider.businessName);

  // Create second provider
  const providerUser2 = await prisma.user.upsert({
    where: { email: "keisha@nailbook.test" },
    update: {},
    create: {
      clerkId: "test_provider_002",
      email: "keisha@nailbook.test",
      firstName: "Keisha",
      lastName: "Williams",
      role: "PROVIDER",
    },
  });

  const provider2 = await prisma.provider.upsert({
    where: { slug: "keisha-beauty" },
    update: {},
    create: {
      userId: providerUser2.id,
      slug: "keisha-beauty",
      businessName: "Keisha's Beauty Bar",
      bio: "Natural nail care & classic manicures. Clean, calm, beautiful. Walk-ins welcome on availability.",
      locationAddress: "456 Glow St, Atlanta, GA 30308",
      locationLat: 33.7725,
      locationLng: -84.3655,
      isVerified: false,
      acceptsCard: true,
      acceptsApplePay: false,
      acceptsGooglePay: false,
      acceptsCashAppPay: true,
      acceptsCash: true,
      instantBook: false,
      requireInspirationPhoto: true,
      arrivalGraceMinutes: 10,
      cancellationHours: 12,
      noShowFeePercent: 50,
    },
  });
  console.log("  Created provider:", provider2.businessName);

  // ─── Services for Jasmine ──────────────────────────────

  const gelFullSet = await prisma.service.create({
    data: {
      providerId: provider.id,
      name: "Gel-X Full Set",
      description: "Soft gel extensions with your choice of shape and length. Includes one color or design.",
      priceInCents: 8500,
      durationMinutes: 90,
      depositType: "FLAT",
      depositValue: 2500,
      sortOrder: 0,
    },
  });

  await prisma.addOn.createMany({
    data: [
      { serviceId: gelFullSet.id, name: "Chrome finish", priceInCents: 1500, durationMinutes: 15 },
      { serviceId: gelFullSet.id, name: "Nail art (2 nails)", priceInCents: 2000, durationMinutes: 20 },
      { serviceId: gelFullSet.id, name: "Extra length", priceInCents: 1000, durationMinutes: 10 },
    ],
  });

  await prisma.service.create({
    data: {
      providerId: provider.id,
      name: "Gel Fill",
      description: "Maintenance fill for existing gel extensions. Includes reshaping and one color.",
      priceInCents: 5500,
      durationMinutes: 60,
      depositType: "PERCENT",
      depositValue: 30,
      sortOrder: 1,
    },
  });

  await prisma.service.create({
    data: {
      providerId: provider.id,
      name: "Classic Manicure",
      description: "Shape, cuticle care, hand massage, and gel polish.",
      priceInCents: 3500,
      durationMinutes: 45,
      depositType: "NONE",
      depositValue: 0,
      sortOrder: 2,
    },
  });

  await prisma.service.create({
    data: {
      providerId: provider.id,
      name: "Nail Art Full Set",
      description: "Custom hand-painted designs on all 10 nails. Bring your inspo!",
      priceInCents: 12000,
      durationMinutes: 120,
      depositType: "FLAT",
      depositValue: 4000,
      sortOrder: 3,
    },
  });

  await prisma.service.create({
    data: {
      providerId: provider.id,
      name: "Soak Off & Natural Nail Care",
      description: "Safe removal of existing gel/acrylic with nail strengthening treatment.",
      priceInCents: 2500,
      durationMinutes: 30,
      depositType: "NONE",
      depositValue: 0,
      sortOrder: 4,
    },
  });

  console.log("  Created 5 services for Jasmine");

  // ─── Services for Keisha ───────────────────────────────

  await prisma.service.create({
    data: {
      providerId: provider2.id,
      name: "Classic Manicure",
      description: "Shape, buff, cuticle care, and regular polish.",
      priceInCents: 2800,
      durationMinutes: 40,
      depositType: "NONE",
      depositValue: 0,
      sortOrder: 0,
    },
  });

  await prisma.service.create({
    data: {
      providerId: provider2.id,
      name: "Gel Manicure",
      description: "Long-lasting gel polish with full manicure service.",
      priceInCents: 4000,
      durationMinutes: 50,
      depositType: "FLAT",
      depositValue: 1500,
      sortOrder: 1,
    },
  });

  await prisma.service.create({
    data: {
      providerId: provider2.id,
      name: "Spa Pedicure",
      description: "Full pedicure with sugar scrub, hot towel, and massage.",
      priceInCents: 5000,
      durationMinutes: 60,
      depositType: "FLAT",
      depositValue: 2000,
      sortOrder: 2,
    },
  });

  console.log("  Created 3 services for Keisha");

  // ─── Availability Rules ────────────────────────────────

  // Jasmine: Tue–Sat 10am–6pm
  const jasmineDays = [2, 3, 4, 5, 6]; // Tue-Sat
  for (const day of jasmineDays) {
    await prisma.availabilityRule.create({
      data: {
        providerId: provider.id,
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "18:00",
        isActive: true,
      },
    });
  }
  console.log("  Created availability for Jasmine (Tue-Sat 10am-6pm)");

  // Keisha: Mon–Fri 9am–5pm
  const keishaDays = [1, 2, 3, 4, 5]; // Mon-Fri
  for (const day of keishaDays) {
    await prisma.availabilityRule.create({
      data: {
        providerId: provider2.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      },
    });
  }
  console.log("  Created availability for Keisha (Mon-Fri 9am-5pm)");

  // ─── Time Off ──────────────────────────────────────────

  await prisma.timeOff.create({
    data: {
      providerId: provider.id,
      startDate: new Date("2026-03-15"),
      endDate: new Date("2026-03-17"),
      reason: "Personal days",
    },
  });
  console.log("  Created time off for Jasmine (Mar 15-17)");

  // ─── Sample Appointment ────────────────────────────────

  const nextTuesday = new Date();
  nextTuesday.setDate(nextTuesday.getDate() + ((2 - nextTuesday.getDay() + 7) % 7 || 7));
  nextTuesday.setHours(14, 0, 0, 0);

  const appointment = await prisma.appointment.create({
    data: {
      providerId: provider.id,
      clientId: clientUser.id,
      serviceId: gelFullSet.id,
      status: "CONFIRMED",
      startTime: nextTuesday,
      endTime: new Date(nextTuesday.getTime() + 90 * 60 * 1000),
      totalInCents: 8500,
      depositInCents: 2500,
      clientName: "Maya Johnson",
      clientEmail: "client@test.com",
      isNewClient: true,
    },
  });

  await prisma.appointmentEvent.create({
    data: {
      appointmentId: appointment.id,
      type: "created",
      actorType: "client",
      actorId: clientUser.id,
    },
  });

  await prisma.appointmentEvent.create({
    data: {
      appointmentId: appointment.id,
      type: "payment_received",
      actorType: "system",
      metadata: { amount: 2500, method: "CARD" },
    },
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      providerId: provider.id,
      appointmentId: appointment.id,
      amountInCents: 2500,
      type: "DEPOSIT",
      status: "COMPLETED",
      method: "CARD",
    },
  });

  // Create thread for the appointment
  const thread = await prisma.thread.create({
    data: {
      providerId: provider.id,
      appointmentId: appointment.id,
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: clientUser.id,
      body: "Hi! So excited for my appointment. Can I get stiletto shape?",
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: providerUser.id,
      body: "Of course! Stiletto is gorgeous. See you Tuesday! 💅",
    },
  });

  console.log("  Created sample appointment + messages for next Tuesday");

  // ─── Favorite ──────────────────────────────────────────

  await prisma.favoriteProvider.create({
    data: {
      userId: clientUser.id,
      providerId: provider.id,
    },
  });
  console.log("  Maya saved Jasmine as favorite");

  console.log("\n✓ Seed complete!");
  console.log("\nTest URLs:");
  console.log("  Provider 1: http://localhost:3000/jasmine-nails");
  console.log("  Provider 2: http://localhost:3000/keisha-beauty");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
