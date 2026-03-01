import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createBookingSchema } from "@nailbook/shared";
import { stripe } from "@/lib/stripe";
import { sendClientConfirmation, sendProviderNewBooking, formatDateTime, type BookingEmailData } from "@/lib/email";
import { sendBookingConfirmationSms } from "@/lib/sms";
import { invalidateAvailability } from "@/lib/cache";
import { scheduleReminders } from "@/lib/schedule-jobs";
import { strictRateLimit } from "@/lib/rate-limit";
import { calculateDiscount, calculateDeposit } from "@/lib/pricing";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// GET /api/appointments — list appointments for current user
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user) return error("User not found", 404);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build date range filter for startTime
  const startTimeFilter: Record<string, Date> = {};
  if (startDate) startTimeFilter.gte = new Date(startDate);
  if (endDate) startTimeFilter.lt = new Date(endDate);
  const hasDateFilter = Object.keys(startTimeFilter).length > 0;

  // If provider, show their appointments; if client, show their bookings
  const where = user.provider
    ? {
        providerId: user.provider.id,
        ...(status ? { status: status as never } : {}),
        ...(hasDateFilter ? { startTime: startTimeFilter } : {}),
      }
    : {
        clientId: user.id,
        ...(status ? { status: status as never } : {}),
        ...(hasDateFilter ? { startTime: startTimeFilter } : {}),
      };

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      service: true,
      addOns: { select: { id: true, name: true, priceInCents: true, durationMinutes: true } },
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      provider: {
        select: { businessName: true, slug: true, timezone: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return success(appointments);
}

// POST /api/appointments — create a new booking
export async function POST(request: NextRequest) {
  const limited = await strictRateLimit(request);
  if (limited) return limited;

  const result = await parseBody(request, createBookingSchema);
  if (result.error) return result.error;

  const { serviceId, startTime, clientName: rawClientName, clientEmail, clientPhone: rawClientPhone, paymentMethod, inspirationUrl, addOnIds, couponCode, intakeResponses: rawIntakeResponses, recurrence } =
    result.data;

  // Sanitize free-text inputs to prevent XSS
  const clientName = sanitizeText(rawClientName);
  const clientPhone = sanitizeText(rawClientPhone);
  const intakeResponses = rawIntakeResponses?.map((r: { questionId: string; answer: string }) => ({
    ...r,
    answer: sanitizeText(r.answer),
  }));

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      provider: {
        include: { user: { select: { email: true } } },
      },
    },
  });
  if (!service) return error("Service not found", 404);

  // Books open/close check
  const now = new Date();
  if (!service.provider.booksOpen && service.provider.booksOpenAt && service.provider.booksOpenAt <= now) {
    await prisma.provider.update({
      where: { id: service.provider.id },
      data: { booksOpen: true, booksOpenAt: null },
    });
    service.provider.booksOpen = true;
    service.provider.booksOpenAt = null;
  }
  if (!service.provider.booksOpen) {
    return error("Books are currently closed", 403);
  }

  // Booking window check
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + service.provider.bookingWindowDays);
  const start = new Date(startTime);
  if (start > maxBookingDate) {
    return error("This date is outside the booking window", 400);
  }

  // Fetch all active add-ons for the service (for mandatory and group validation)
  const allServiceAddOns = await prisma.addOn.findMany({
    where: { serviceId, isActive: true },
    select: { id: true, priceInCents: true, durationMinutes: true, groupId: true, isMandatory: true },
  });

  // Build selection set: start with client picks, then merge mandatory
  const selectionSet = new Set(addOnIds || []);
  for (const addon of allServiceAddOns) {
    if (addon.isMandatory) selectionSet.add(addon.id);
  }

  // Validate client-provided IDs exist
  if (addOnIds && addOnIds.length > 0) {
    const validIds = new Set(allServiceAddOns.map((a) => a.id));
    for (const id of addOnIds) {
      if (!validIds.has(id)) return error("One or more add-ons are invalid", 400);
    }
  }

  // Validate group rules
  const addOnGroups = await prisma.addOnGroup.findMany({
    where: { serviceId },
    select: { id: true, name: true, rule: true },
  });
  for (const group of addOnGroups) {
    if (group.rule === "OPTIONAL") continue;
    const groupAddOnIds = allServiceAddOns.filter((a) => a.groupId === group.id).map((a) => a.id);
    const selectedFromGroup = groupAddOnIds.filter((id) => selectionSet.has(id));
    if (group.rule === "EXACTLY_ONE") {
      if (selectedFromGroup.length !== 1) {
        return error(`Please select exactly one from "${group.name}"`, 400);
      }
    } else if (group.rule === "AT_LEAST_ONE") {
      if (selectedFromGroup.length < 1) {
        return error(`Please select at least one from "${group.name}"`, 400);
      }
    }
  }

  const selectedAddOns = allServiceAddOns.filter((a) => selectionSet.has(a.id));

  const addOnPriceCents = selectedAddOns.reduce((sum, a) => sum + a.priceInCents, 0);
  const addOnDurationMin = selectedAddOns.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalBeforeDiscount = service.priceInCents + addOnPriceCents;

  // Validate and apply coupon
  let couponId: string | undefined;
  let discountInCents = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { providerId_code: { providerId: service.providerId, code: couponCode.toUpperCase().trim() } },
      include: { services: { select: { id: true } } },
    });
    if (!coupon || !coupon.isActive) {
      return error("Invalid coupon code", 400);
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return error("This coupon has expired", 400);
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return error("This coupon has been fully redeemed", 400);
    }
    if (coupon.services.length > 0 && !coupon.services.some((s) => s.id === serviceId)) {
      return error("This coupon doesn't apply to this service", 400);
    }
    couponId = coupon.id;
    discountInCents = calculateDiscount(totalBeforeDiscount, coupon.type as "PERCENT" | "FIXED", coupon.value);
  }

  const totalPriceCents = totalBeforeDiscount - discountInCents;

  const end = new Date(start.getTime() + (service.durationMinutes + addOnDurationMin) * 60 * 1000);

  // Generate all recurring dates (or just the single date)
  const recurringDates: { start: Date; end: Date }[] = [{ start, end }];
  if (recurrence) {
    for (let i = 1; i < recurrence.count; i++) {
      const rStart = new Date(start);
      if (recurrence.frequency === "WEEKLY") rStart.setDate(start.getDate() + i * 7);
      else if (recurrence.frequency === "BIWEEKLY") rStart.setDate(start.getDate() + i * 14);
      else rStart.setMonth(start.getMonth() + i);
      const rEnd = new Date(rStart.getTime() + (service.durationMinutes + addOnDurationMin) * 60 * 1000);
      recurringDates.push({ start: rStart, end: rEnd });
    }
  }

  // Check for overlapping confirmed appointments on ALL dates
  for (const rd of recurringDates) {
    const overlap = await prisma.appointment.findFirst({
      where: {
        providerId: service.providerId,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        startTime: { lt: rd.end },
        endTime: { gt: rd.start },
      },
    });
    if (overlap) {
      const conflictDate = rd.start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return error(`Time slot on ${conflictDate} is no longer available`, 409);
    }
  }

  // Calculate deposit (based on discounted total)
  const depositInCents = calculateDeposit(totalPriceCents, service.depositType as "NONE" | "FLAT" | "PERCENT", service.depositValue);

  // Validate payment method against provider settings and deposit
  if (paymentMethod === "CASH" && depositInCents > 0 && totalPriceCents > 0) {
    return error("Cash payments are not available for services that require a deposit", 400);
  }

  const methodFlagMap: Record<string, keyof typeof service.provider> = {
    CARD: "acceptsCard",
    APPLE_PAY: "acceptsApplePay",
    GOOGLE_PAY: "acceptsGooglePay",
    CASH_APP_PAY: "acceptsCashAppPay",
    CASH: "acceptsCash",
  };
  const flag = methodFlagMap[paymentMethod];
  if (flag && !service.provider[flag]) {
    return error("This provider does not accept that payment method", 400);
  }

  // Determine client ID (authenticated or guest)
  let clientId: string | undefined;
  try {
    const { userId } = await auth();
    if (userId) {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      clientId = user?.id;
    }
  } catch {
    // Not authenticated — that's fine for public bookings
  }

  // For guest bookings, find or create a user by email
  if (!clientId && clientEmail) {
    const guestUser = await prisma.user.upsert({
      where: { email: clientEmail },
      update: {},
      create: {
        clerkId: `guest_${Date.now()}`,
        email: clientEmail,
        firstName: clientName || undefined,
        role: "CLIENT",
      },
    });
    clientId = guestUser.id;
  }

  if (!clientId) return error("Email is required for booking", 400);

  // Check if this booking came from a waitlist entry
  let bookedFromWaitlist = false;
  if (clientEmail) {
    const targetDate = new Date(`${start.toISOString().split("T")[0]}T00:00:00.000Z`);
    const matchingWaitlist = await prisma.waitlistEntry.findFirst({
      where: {
        providerId: service.providerId,
        clientEmail: clientEmail.toLowerCase().trim(),
        targetDate,
        status: { in: ["ACTIVE", "AVAILABLE", "NOTIFIED"] },
      },
      select: { id: true },
    });
    bookedFromWaitlist = !!matchingWaitlist;
  }

  // If total is $0 after discount, treat like cash (no Stripe needed)
  const isFreeAfterDiscount = totalPriceCents === 0;
  const skipStripe = paymentMethod === "CASH" || isFreeAfterDiscount;

  // Create appointment(s)
  const recurrenceGroupId = recurrence ? randomUUID() : undefined;
  const manageToken = randomUUID();

  const appointment = await prisma.$transaction(async (tx) => {
    // Upsert provider client profile (keyed on email)
    let providerClientId: string | undefined;
    let isNewClient = true;
    if (clientEmail) {
      const providerClient = await tx.providerClient.upsert({
        where: {
          providerId_email: {
            providerId: service.providerId,
            email: clientEmail.toLowerCase().trim(),
          },
        },
        update: {
          name: clientName || undefined,
          phone: clientPhone || undefined,
        },
        create: {
          providerId: service.providerId,
          email: clientEmail.toLowerCase().trim(),
          name: clientName || undefined,
          phone: clientPhone || undefined,
        },
      });
      providerClientId = providerClient.id;

      // Check if this client has any previous appointments with this provider
      const previousAppt = await tx.appointment.findFirst({
        where: { providerClientId: providerClient.id },
        select: { id: true },
      });
      isNewClient = !previousAppt;
    }

    // Create the first (primary) appointment — this one gets payment
    const appt = await tx.appointment.create({
      data: {
        providerId: service.providerId,
        clientId,
        serviceId,
        status: skipStripe ? "CONFIRMED" : "PENDING_PAYMENT",
        startTime: start,
        endTime: end,
        totalInCents: totalPriceCents,
        depositInCents: isFreeAfterDiscount ? 0 : depositInCents,
        discountInCents,
        couponId,
        clientName,
        clientEmail,
        clientPhone,
        inspirationUrl,
        isNewClient,
        bookedFromWaitlist,
        providerClientId,
        manageToken,
        recurrenceGroupId,
        recurrenceIndex: recurrence ? 0 : undefined,
        ...(selectedAddOns.length > 0 && {
          addOns: { connect: selectedAddOns.map((a) => ({ id: a.id })) },
        }),
      },
    });

    // Create subsequent recurring appointments (auto-confirmed, no payment)
    if (recurrence && recurringDates.length > 1) {
      for (let i = 1; i < recurringDates.length; i++) {
        const rd = recurringDates[i];
        const recurToken = randomUUID();
        const recurAppt = await tx.appointment.create({
          data: {
            providerId: service.providerId,
            clientId,
            serviceId,
            status: "CONFIRMED",
            startTime: rd.start,
            endTime: rd.end,
            totalInCents: totalPriceCents,
            depositInCents: 0,
            discountInCents,
            couponId,
            clientName,
            clientEmail,
            clientPhone,
            inspirationUrl,
            isNewClient: false,
            bookedFromWaitlist: false,
            providerClientId,
            manageToken: recurToken,
            recurrenceGroupId,
            recurrenceIndex: i,
            ...(selectedAddOns.length > 0 && {
              addOns: { connect: selectedAddOns.map((a) => ({ id: a.id })) },
            }),
          },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: recurAppt.id,
            type: "created",
            actorType: clientId ? "client" : "system",
            actorId: clientId,
            metadata: { recurring: true, groupId: recurrenceGroupId, index: i },
          },
        });
      }
    }

    // Increment coupon usage
    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: recurrence ? recurrence.count : 1 } },
      });
    }

    // Write event for primary appointment
    await tx.appointmentEvent.create({
      data: {
        appointmentId: appt.id,
        type: "created",
        actorType: clientId ? "client" : "system",
        actorId: clientId,
        ...(recurrence && {
          metadata: { recurring: true, groupId: recurrenceGroupId, index: 0, totalCount: recurrence.count },
        }),
      },
    });

    // Save intake form responses (on primary appointment only)
    if (intakeResponses && intakeResponses.length > 0) {
      await tx.intakeResponse.createMany({
        data: intakeResponses.map((r: { questionId: string; answer: string }) => ({
          appointmentId: appt.id,
          questionId: r.questionId,
          answer: r.answer,
        })),
      });
    }

    return appt;
  });

  // Invalidate availability cache for all booked dates
  for (const rd of recurringDates) {
    await invalidateAvailability(service.providerId, rd.start.toISOString().split("T")[0]);
  }

  // Mark matching waitlist entry as BOOKED (fire-and-forget)
  if (clientEmail) {
    const targetDate = new Date(`${start.toISOString().split("T")[0]}T00:00:00.000Z`);
    prisma.waitlistEntry.updateMany({
      where: {
        providerId: service.providerId,
        clientEmail: clientEmail.toLowerCase().trim(),
        targetDate,
        status: { in: ["ACTIVE", "AVAILABLE", "NOTIFIED"] },
      },
      data: { status: "BOOKED" },
    }).catch((e) => console.error("[waitlist] Failed to mark as BOOKED:", e));
  }

  // If cash or free after discount, no Stripe needed — send confirmation emails immediately
  if (skipStripe) {
    const emailData: BookingEmailData = {
      providerName: service.provider.businessName,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      startTime: start,
      endTime: end,
      totalInCents: totalPriceCents,
      depositInCents: isFreeAfterDiscount ? 0 : depositInCents,
      paymentType: isFreeAfterDiscount ? "FREE" : "CASH",
      locationAddress: service.provider.locationAddress,
      cancellationHours: service.provider.cancellationHours,
      arrivalGraceMinutes: service.provider.arrivalGraceMinutes,
      clientName,
      clientEmail,
      timezone: service.provider.timezone,
      slug: service.provider.slug,
      appointmentId: appointment.id,
      manageToken,
    };
    try {
      await Promise.all([
        sendClientConfirmation(emailData, service.providerId),
        sendProviderNewBooking(service.provider.user.email, emailData, service.providerId),
      ]);
    } catch (e) {
      console.error("[email] Failed to send booking emails:", e);
    }
    // Send booking confirmation SMS
    if (clientPhone) {
      const smsVars: Record<string, string> = {
        providerName: service.provider.businessName,
        serviceName: service.name,
        clientName: clientName || "Client",
        clientEmail: clientEmail || "",
        dateTime: formatDateTime(start, service.provider.timezone),
        duration: String(service.durationMinutes),
        total: `$${(totalPriceCents / 100).toFixed(2)}`,
        deposit: `$${((isFreeAfterDiscount ? 0 : depositInCents) / 100).toFixed(2)}`,
        paymentLine: isFreeAfterDiscount ? "Free — discount applied" : `Pay at appointment: $${(totalPriceCents / 100).toFixed(2)}`,
        location: service.provider.locationAddress || "",
        cancellationHours: String(service.provider.cancellationHours),
        arrivalGraceMinutes: String(service.provider.arrivalGraceMinutes),
        calendarUrl: "",
      };
      sendBookingConfirmationSms(clientPhone, smsVars, service.providerId).catch((e) =>
        console.error("[sms] Failed to send booking confirmation SMS:", e)
      );
    }
    // Schedule reminder jobs (24h + 2h before appointment)
    scheduleReminders(appointment.id, start).catch((e) =>
      console.error("[jobs] Failed to schedule reminders:", e)
    );
    return success(appointment, 201);
  }

  // Create Stripe checkout session for deposit or full payment
  const amountToCharge = depositInCents > 0 ? depositInCents : totalPriceCents;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${service.name}${depositInCents > 0 ? " (Deposit)" : ""}`,
            description: `Booking with ${service.provider.businessName}`,
          },
          unit_amount: amountToCharge,
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: appointment.id,
      providerId: service.providerId,
      paymentType: depositInCents > 0 ? "DEPOSIT" : "FULL",
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${service.provider.slug}/confirmation?appointment=${appointment.id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${service.provider.slug}/book?service=${serviceId}`,
  });

  // Store session ID on appointment
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { stripeSessionId: session.id },
  });

  return success({ appointment, checkoutUrl: session.url }, 201);
}
