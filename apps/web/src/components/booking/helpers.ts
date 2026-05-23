import type { PaymentMethod, ServiceData } from "./types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  CARD: "Card",
  CASH_APP_PAY: "Cash App Pay",
  CASH: "Cash",
};

export function getAvailablePaymentMethods(service: ServiceData): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  const p = service.provider;
  const hasDeposit = service.depositType !== "NONE";
  if (p.acceptsApplePay) methods.push("APPLE_PAY");
  if (p.acceptsGooglePay) methods.push("GOOGLE_PAY");
  if (p.acceptsCard) methods.push("CARD");
  if (p.acceptsCashAppPay) methods.push("CASH_APP_PAY");
  if (p.acceptsCash && !hasDeposit) methods.push("CASH");
  return methods;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

export function formatLongDate(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getDepositAmount(
  service: ServiceData,
  totalCents: number,
): number {
  if (service.depositType === "FLAT")
    return Math.min(service.depositValue, totalCents);
  if (service.depositType === "PERCENT")
    return Math.round((totalCents * service.depositValue) / 100);
  return 0;
}

export function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
