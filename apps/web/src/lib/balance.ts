import { prisma } from "@/lib/db";
import { calculateBalance } from "@/lib/pricing";

export type BalanceInfo = {
  totalInCents: number;
  depositInCents: number;
  balancePaidInCents: number;
  remainingInCents: number;
  isPaid: boolean;
};

export async function getBalanceInfo(
  appointmentId: string,
): Promise<BalanceInfo | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      totalInCents: true,
      depositInCents: true,
      payments: {
        where: { type: "BALANCE", status: "COMPLETED" },
        select: { amountInCents: true },
      },
    },
  });

  if (!appointment) return null;

  const balancePaidInCents = appointment.payments.reduce(
    (sum, p) => sum + p.amountInCents,
    0,
  );
  const { remainingInCents, isPaid } = calculateBalance(
    appointment.totalInCents,
    appointment.depositInCents,
    balancePaidInCents,
  );

  return {
    totalInCents: appointment.totalInCents,
    depositInCents: appointment.depositInCents,
    balancePaidInCents,
    remainingInCents,
    isPaid,
  };
}
