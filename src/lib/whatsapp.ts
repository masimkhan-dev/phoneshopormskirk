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
  | { kind: "product"; product: string }
  | { kind: "stock"; product: string }
  | { kind: "unlock"; device?: string; network?: string };

const BUSINESS = "Phone Shop Ormskirk";

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
    case "product":
      return [
        `Hi ${BUSINESS},`,
        "",
        `I'm interested in ${ctx.product}.`,
        "Is this currently available?",
      ];
    case "stock":
      return [
        `Hi ${BUSINESS},`,
        "",
        `${ctx.product} is showing as out of stock on your website.`,
        "Do you know when you'll have one in, or have you got something similar?",
      ];
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
  const number = (business?.whatsapp ?? "").replace(/[^0-9]/g, "");
  const text = encodeURIComponent(lines(ctx).join("\n"));
  if (!number) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${number}?text=${text}`;
}

export function telUrl(business: Pick<BusinessSettings, "phone"> | null | undefined) {
  return `tel:${(business?.phone ?? "").replace(/\s+/g, "")}`;
}
