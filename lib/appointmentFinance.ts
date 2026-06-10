export type AppointmentPaymentStatus =
  | "none"
  | "deposit_pending"
  | "deposit_paid"
  | "partial_paid"
  | "paid"
  | "paid_offline"
  | "refunded"
  | string;

export type AppointmentPaymentMethod =
  | "stripe"
  | "cash"
  | "paypal"
  | "bank_transfer"
  | "check"
  | "other";

export type AppointmentFinanceLike = {
  price?: number | { toString(): string } | null;
  depositAmount?: number | { toString(): string } | null;
  depositPaidAmount?: number | { toString(): string } | null;
  paidAmount?: number | { toString(): string } | null;
  remainingAmount?: number | { toString(): string } | null;
  paymentStatus?: AppointmentPaymentStatus | null;
  paymentMethod?: AppointmentPaymentMethod | string | null;
  Service?: {
    price?: number | { toString(): string } | null;
  } | null;
};

export type AppointmentFinancialSummary = {
  priceCents: number;
  depositAmountCents: number;
  depositPaidAmountCents: number;
  paidAmountCents: number;
  remainingAmountCents: number;
  paymentStatus: AppointmentPaymentStatus;
  paymentMethod: AppointmentPaymentMethod | null;
};

const offlinePaymentMethods = new Set<AppointmentPaymentMethod>([
  "cash",
  "paypal",
  "bank_transfer",
  "check",
  "other",
]);

const paymentLabels: Record<string, string> = {
  none: "Aucun paiement",
  deposit_pending: "Arrhes demandées",
  deposit_paid: "Arrhes reçues",
  partial_paid: "Paiement partiel",
  paid: "Payé",
  paid_offline: "Payé hors ligne",
  refunded: "Remboursé",
};

export function normalizeAppointmentPaymentStatus(status?: string | null): AppointmentPaymentStatus {
  if (!status) return "none";

  const normalized = status.toLowerCase();
  if (
    normalized === "none" ||
    normalized === "deposit_pending" ||
    normalized === "deposit_paid" ||
    normalized === "partial_paid" ||
    normalized === "paid" ||
    normalized === "paid_offline" ||
    normalized === "refunded"
  ) {
    return normalized;
  }

  if (normalized === "pending" || normalized === "unpaid") return "none";
  if (normalized === "partial") return "partial_paid";
  if (normalized === "paid") return "paid";
  if (normalized === "refunded") return "refunded";
  return "none";
}

export function readStoredCents(value: number | { toString(): string } | null | undefined) {
  const amount = Number(value?.toString() || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount);
}

export function toCents(value: number | { toString(): string } | null | undefined) {
  const amount = Number(value?.toString() || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

export function centsToEuros(cents: number) {
  return Math.round(cents) / 100;
}

export function clampCents(value: number, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.round(value), max);
}

export function normalizeAppointmentPaymentMethod(
  value?: string | null
): AppointmentPaymentMethod | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (
    normalized === "stripe" ||
    normalized === "cash" ||
    normalized === "paypal" ||
    normalized === "bank_transfer" ||
    normalized === "check" ||
    normalized === "other"
  ) {
    return normalized;
  }

  if (normalized === "transfer") return "bank_transfer";
  if (normalized === "card") return "stripe";
  return "other";
}

export function isOfflinePaymentMethod(
  value?: AppointmentPaymentMethod | string | null
): value is AppointmentPaymentMethod {
  const normalized = normalizeAppointmentPaymentMethod(value || null);
  return Boolean(normalized && offlinePaymentMethods.has(normalized));
}

export function getAppointmentPriceCents(appointment: AppointmentFinanceLike) {
  const priceCents = readStoredCents(appointment.price);
  if (priceCents > 0) return priceCents;
  return toCents(appointment.Service?.price);
}

export function getAppointmentDepositAmountCents(appointment: AppointmentFinanceLike) {
  return clampCents(readStoredCents(appointment.depositAmount), getAppointmentPriceCents(appointment));
}

export function getAppointmentDepositPaidAmountCents(appointment: AppointmentFinanceLike) {
  const priceCents = getAppointmentPriceCents(appointment);
  const stored = readStoredCents(appointment.depositPaidAmount);
  if (stored > 0) {
    return clampCents(stored, priceCents);
  }

  const status = appointment.paymentStatus || "none";
  if (status === "deposit_paid" || status === "partial_paid") {
    return clampCents(getAppointmentDepositAmountCents(appointment), priceCents);
  }

  return 0;
}

export function getAppointmentPaidAmountCents(appointment: AppointmentFinanceLike) {
  const priceCents = getAppointmentPriceCents(appointment);
  const stored = readStoredCents(appointment.paidAmount);
  if (stored > 0) {
    return clampCents(stored, priceCents);
  }

  const status = appointment.paymentStatus || "none";
  if (status === "paid" || status === "paid_offline") {
    return priceCents;
  }

  if (status === "deposit_paid" || status === "partial_paid") {
    return getAppointmentDepositPaidAmountCents(appointment);
  }

  return 0;
}

export function getAppointmentRemainingAmountCents(appointment: AppointmentFinanceLike) {
  const priceCents = getAppointmentPriceCents(appointment);
  const stored = readStoredCents(appointment.remainingAmount);
  if (stored > 0) {
    return clampCents(stored, priceCents);
  }

  return Math.max(priceCents - getAppointmentPaidAmountCents(appointment), 0);
}

export function getAppointmentPaymentStatus(appointment: AppointmentFinanceLike): AppointmentPaymentStatus {
  const stored = normalizeAppointmentPaymentStatus(appointment.paymentStatus || null);
  if (stored === "refunded") return "refunded";
  if (stored === "deposit_pending") return "deposit_pending";

  const priceCents = getAppointmentPriceCents(appointment);
  const paidCents = getAppointmentPaidAmountCents(appointment);
  const depositPaidCents = getAppointmentDepositPaidAmountCents(appointment);
  const depositCents = getAppointmentDepositAmountCents(appointment);

  if (paidCents <= 0) {
    return depositCents > 0 ? "deposit_pending" : "none";
  }

  if (paidCents >= priceCents && priceCents > 0) {
    return isOfflinePaymentMethod(appointment.paymentMethod) ? "paid_offline" : "paid";
  }

  if (depositPaidCents > 0 && paidCents <= depositPaidCents) {
    return "deposit_paid";
  }

  return "partial_paid";
}

export function getAppointmentFinancialSummary(
  appointment: AppointmentFinanceLike
): AppointmentFinancialSummary {
  const priceCents = getAppointmentPriceCents(appointment);
  const depositAmountCents = getAppointmentDepositAmountCents(appointment);
  const depositPaidAmountCents = getAppointmentDepositPaidAmountCents(appointment);
  const paidAmountCents = getAppointmentPaidAmountCents(appointment);
  const remainingAmountCents = Math.max(priceCents - paidAmountCents, 0);
  const paymentStatus = getAppointmentPaymentStatus(appointment);
  const paymentMethod = normalizeAppointmentPaymentMethod(appointment.paymentMethod || null);

  return {
    priceCents,
    depositAmountCents,
    depositPaidAmountCents,
    paidAmountCents,
    remainingAmountCents,
    paymentStatus,
    paymentMethod,
  };
}

export function getAppointmentPaymentLabel(status?: string | null) {
  return paymentLabels[normalizeAppointmentPaymentStatus(status || null)] || "Aucun paiement";
}

export function mapAppointmentPaymentMethodToFinancialMethod(
  method?: AppointmentPaymentMethod | string | null
) {
  const normalized = normalizeAppointmentPaymentMethod(method || null);
  if (normalized === "stripe") return "CARD" as const;
  if (normalized === "cash") return "CASH" as const;
  if (normalized === "bank_transfer") return "TRANSFER" as const;
  return "OTHER" as const;
}

export function formatAppointmentPaymentMethod(method?: AppointmentPaymentMethod | string | null) {
  const normalized = normalizeAppointmentPaymentMethod(method || null);
  if (normalized === "stripe") return "Stripe";
  if (normalized === "cash") return "Especes";
  if (normalized === "paypal") return "PayPal";
  if (normalized === "bank_transfer") return "Virement";
  if (normalized === "check") return "Cheque";
  return "Autre";
}
