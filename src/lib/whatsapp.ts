import type { BusinessSettings } from "./types";

export type WhatsAppContext =
  | { kind: "general" }
  | { kind: "repair"; device?: string; repair?: string }
  | {
      kind: "sell";
      device?: string;
      storage?: string;
      condition?: string;
      network?: string;
    }
  | {
      kind: "product";
      product: string;
      /** Formatted price string e.g. "£650" — include when available */
      price?: string;
      condition?: string;
      storage?: string;
      model?: string;
      /** Full public URL of the product page */
      productUrl?: string;
    }
  | {
      kind: "stock";
      product: string;
      price?: string;
      condition?: string;
      storage?: string;
      model?: string;
      productUrl?: string;
    }
  | { kind: "unlock"; device?: string; network?: string };

export const CANONICAL_WHATSAPP_NUMBER = "447496499992";
const BUSINESS = "Phone Store Ormskirk";

/**
 * Normalizes any UK or international phone string into pure wa.me digits.
 * Converts UK national format (e.g. "07496 499992") -> "447496499992".
 * Strips +, spaces, hyphens, brackets, and leading 0.
 * Falls back to CANONICAL_WHATSAPP_NUMBER if missing, empty, or invalid.
 */
export function normalizeWhatsAppNumber(raw?: string | null): string {
  if (!raw) return CANONICAL_WHATSAPP_NUMBER;
  let digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return CANONICAL_WHATSAPP_NUMBER;

  // e.g. 00447496499992 -> 447496499992
  if (digits.startsWith("0044")) {
    digits = "44" + digits.slice(4);
  }
  // e.g. +44 (0) 7496499992 -> 4407496499992 -> 447496499992
  if (digits.startsWith("440")) {
    digits = "44" + digits.slice(3);
  }
  // e.g. 07496499992 -> 447496499992 (UK national mobile to international)
  if (digits.startsWith("0")) {
    digits = "44" + digits.slice(1);
  }

  // Must be at least 10 digits to be a valid phone number, else fallback
  if (digits.length < 10) {
    return CANONICAL_WHATSAPP_NUMBER;
  }

  return digits;
}

function lines(ctx: WhatsAppContext): string[] {
  switch (ctx.kind) {
    case "repair":
      return [
        `Hi ${BUSINESS},`,
        "",
        "I would like a repair quote.",
        `Device: ${ctx.device?.trim() || "[your device]"}`,
        `Repair: ${ctx.repair?.trim() || "[what needs fixing]"}`,
        "",
        "Could you please confirm the price and availability?",
      ];
    case "sell":
      return [
        `Hi ${BUSINESS},`,
        "",
        "I would like to sell my phone.",
        `Device: ${ctx.device?.trim() || "[brand and model]"}`,
        `Storage: ${ctx.storage?.trim() || "[storage]"}`,
        `Condition: ${ctx.condition?.trim() || "[condition]"}`,
        ...(ctx.network ? [`Network: ${ctx.network}`] : []),
        "",
        "Could you please give me an estimated quote?",
      ];
    case "product": {
      const attrs: string[] = [];
      if (ctx.condition) attrs.push(ctx.condition);
      if (ctx.storage) attrs.push(ctx.storage);
      if (ctx.model && ctx.model !== ctx.product) attrs.push(ctx.model);
      return [
        `Hi ${BUSINESS},`,
        "",
        "I'm interested in:",
        ctx.product,
        ...attrs,
        "",
        ...(ctx.price ? [`Price: ${ctx.price}`] : []),
        ...(ctx.productUrl ? ["", "Product link:", ctx.productUrl] : []),
        "",
        "Is this still available to order or collect?",
      ];
    }
    case "stock": {
      const attrs: string[] = [];
      if (ctx.condition) attrs.push(ctx.condition);
      if (ctx.storage) attrs.push(ctx.storage);
      if (ctx.model && ctx.model !== ctx.product) attrs.push(ctx.model);
      return [
        `Hi ${BUSINESS},`,
        "",
        "I noticed this product is currently out of stock:",
        "",
        ctx.product,
        ...attrs,
        "",
        ...(ctx.price ? [`Price: ${ctx.price}`] : []),
        ...(ctx.productUrl ? ["", "Product link:", ctx.productUrl] : []),
        "",
        "Do you have one available, or can you let me know when it's back in stock?",
      ];
    }
    case "unlock":
      return [
        `Hi ${BUSINESS},`,
        "",
        "I would like an unlocking quote.",
        `Device: ${ctx.device?.trim() || "[your device]"}`,
        `Network: ${ctx.network?.trim() || "[current network]"}`,
        "",
        "Could you please let me know the price and what you need from me?",
      ];
    default:
      return [`Hi ${BUSINESS},`, "", "I have a question about your store."];
  }
}

/** Single place that builds every WhatsApp deep link used on the site. */
export function whatsappUrl(
  business: Pick<BusinessSettings, "whatsapp"> | null | undefined,
  ctx: WhatsAppContext = { kind: "general" },
): string {
  const number = normalizeWhatsAppNumber(business?.whatsapp);
  const text = encodeURIComponent(lines(ctx).join("\n"));
  return `https://wa.me/${number}?text=${text}`;
}

export function telUrl(business: Pick<BusinessSettings, "phone"> | null | undefined) {
  const raw = (business?.phone ?? "").replace(/[^0-9+]/g, "");
  if (!raw) return "tel:+447496499992";
  if (raw.startsWith("0")) return `tel:+44${raw.slice(1)}`;
  if (raw.startsWith("44")) return `tel:+${raw}`;
  if (raw.startsWith("+")) return `tel:${raw}`;
  return `tel:${raw}`;
}
