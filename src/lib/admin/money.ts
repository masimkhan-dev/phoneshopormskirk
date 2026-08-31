/** Money + UK formatting helpers. All authoritative values are integer pence. */

export function penceToPounds(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return (pence / 100).toFixed(2);
}

/** Parse a user-typed pounds string into integer pence. Never trust floats. */
export function poundsToPence(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const raw = String(value).replace(/[£,\s]/g, "");
  if (!/^-?\d*(\.\d{0,2})?$/.test(raw)) {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }
  const negative = raw.startsWith("-");
  const [whole, frac = ""] = raw.replace("-", "").split(".");
  const pence =
    Number.parseInt(whole || "0", 10) * 100 +
    Number.parseInt((frac + "00").slice(0, 2), 10);
  return negative ? -pence : pence;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export function money(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "—";
  return gbp.format(pence / 100);
}

export const SHOP_TZ = "Europe/London";

export function ukDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: SHOP_TZ,
  }).format(d);
}

export function ukDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SHOP_TZ,
  }).format(d);
}

/** ISO date (yyyy-mm-dd) for "today" in shop time. */
export function shopToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ }).format(new Date());
}

/** Start of a named period, as a UTC ISO timestamp usable in queries. */
export function periodStart(period: "today" | "week" | "month" | "year"): string {
  const today = shopToday();
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  if (period === "week") {
    const dow = (base.getUTCDay() + 6) % 7; // Monday = 0
    base.setUTCDate(base.getUTCDate() - dow);
  } else if (period === "month") {
    base.setUTCDate(1);
  } else if (period === "year") {
    base.setUTCMonth(0, 1);
  }
  return base.toISOString();
}

export function daysInStock(createdAt: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000),
  );
}

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
] as const;

export function paymentMethodLabel(method: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "Other";
}

/** Digits-only phone for matching against stored normalised values. */
export function normalisePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
