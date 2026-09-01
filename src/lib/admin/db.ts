import { supabase } from "@/integrations/supabase/client";

/**
 * Turn any backend failure into a message that is safe and useful for staff.
 * Our database workflows raise human-readable messages on purpose; anything
 * that looks like an internal detail is replaced with a generic line.
 */
export function friendlyError(error: unknown): string {
  if (typeof window !== "undefined" && error) {
    console.error("[Database RPC Error]", error);
  }

  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  if (!raw) return "Something went wrong. Please try again.";

  const lower = raw.toLowerCase();

  if (lower.includes("duplicate key")) {
    if (lower.includes("imei")) return "This phone / IMEI is already in stock.";
    if (lower.includes("sku")) return "An item with this SKU or barcode already exists.";
    if (lower.includes("slug") || lower.includes("name")) return "An item with this name or slug already exists.";
    return "A record with these unique details already exists.";
  }

  if (lower.includes("permission denied") || lower.includes("row-level security") || lower.includes("require_staff")) {
    return "You do not have permission or your staff session expired. Please refresh and log in.";
  }

  if (lower.includes("null value in column")) {
    if (lower.includes("name")) return "Please enter a valid product name.";
    if (lower.includes("category")) return "Please select a valid category.";
    if (lower.includes("price")) return "Please enter a valid price.";
    return "Please fill in all required fields.";
  }

  if (lower.includes("invalid input syntax for type uuid")) {
    return "Invalid category or record ID selected.";
  }

  const internal = [
    "syntax error",
    "relation ",
    "column ",
    "function ",
    "JWT",
    "PGRST",
    "violates check constraint",
    "violates foreign key",
  ];
  if (internal.some((needle) => lower.includes(needle.toLowerCase()))) {
    return "That could not be saved. Please check the entered values and try again.";
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
    | "add_existing_phone_stock"
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
