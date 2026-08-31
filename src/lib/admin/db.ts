import { supabase } from "@/integrations/supabase/client";

/**
 * Turn any backend failure into a message that is safe and useful for staff.
 * Our database workflows raise human-readable messages on purpose; anything
 * that looks like an internal detail is replaced with a generic line.
 */
export function friendlyError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  if (!raw) return "Something went wrong. Please try again.";

  const internal = [
    "permission denied",
    "violates row-level security",
    "row-level security",
    "duplicate key value",
    "syntax error",
    "relation ",
    "column ",
    "function ",
    "JWT",
    "PGRST",
    "invalid input syntax",
    "null value in column",
    "violates check constraint",
    "violates foreign key",
  ];
  const lower = raw.toLowerCase();
  if (internal.some((needle) => lower.includes(needle.toLowerCase()))) {
    if (lower.includes("duplicate key") && lower.includes("imei")) {
      return "This phone is already in stock.";
    }
    if (lower.includes("permission denied") || lower.includes("row-level security")) {
      return "You do not have permission to perform this action.";
    }
    return "That could not be saved. Please check the details and try again.";
  }
  return raw;
}

/** Call one of the transactional counter workflows. */
export async function callRpc<T = unknown>(
  name:
    | "create_repair_invoice"
    | "buy_phone"
    | "sell_phone"
    | "direct_sale"
    | "attach_invoice_terms"
    | "take_payment"
    | "void_invoice"
    | "refund_invoice"
    | "save_customer"
    | "save_supplier"
    | "save_product"
    | "update_stock_item"
    | "adjust_product_stock"
    | "set_user_role"
    | "ensure_profile",
  payload?: Record<string, unknown>,
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(name, payload ?? {});
  if (error) throw new Error(friendlyError(error));
  return data as T;
}

/** Idempotency key so a double-tap cannot create two transactions. */
export function newClientRef(): string {
  return crypto.randomUUID();
}
