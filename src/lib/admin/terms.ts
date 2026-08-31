/**
 * Terms & warranty engine.
 *
 * Settings hold one editable template per transaction type. When an invoice is
 * created the staff-facing draft is copied into `invoice_terms` and into the
 * invoice snapshot, so later template edits never change an old receipt.
 */

export type TermsType = "REPAIR" | "PURCHASE" | "SALES" | "NEW_PHONE";

export type TermsSettings = {
  type: TermsType;
  label: string;
  enable_warranty: boolean;
  default_warranty_days: number;
  warranty_title: string;
  warranty_text: string;
  exclusions_text: string;
  default_terms: string;
  footer_note: string;
  seller_declaration: string;
  payment_ack_text: string;
  id_verification_note: string;
  battery_disclaimer: string;
  returns_policy: string;
  manufacturer_note: string;
  doa_days: number;
  activation_note: string;
  accessories_note: string;
  require_acknowledgement: boolean;
  show_signature_line: boolean;
  show_on_thermal: boolean;
  show_on_a4: boolean;
  /** Friendly customer-facing message template (supports {{variables}}). */
  customer_message: string;
  /** One short plain-English warranty exclusion sentence. */
  short_exclusions: string;
  show_exclusions: boolean;
  show_terms_on_request: boolean;
  terms_on_request_text: string;
};

export type TermsDraft = {
  warranty_days: number;
  warranty_title: string;
  warranty_text: string;
  terms_text: string;
  exclusions_text: string;
  footer_note: string;
  additional_terms: string;
  internal_note: string;
  customer_note: string;
  print_customer_note: boolean;
  customer_acknowledged: boolean;
  include_exclusions: boolean;
  /** Customer message for this invoice only. */
  customer_message: string;
};

/** Terms as stored on an invoice — the immutable copy used for printing. */
export type InvoiceTermsSnapshot = {
  invoice_type?: string | null;
  warranty_days?: number | null;
  warranty_expires?: string | null;
  warranty_title?: string | null;
  warranty_text?: string | null;
  terms_text?: string | null;
  exclusions_text?: string | null;
  footer_note?: string | null;
  additional_terms?: string | null;
  customer_note?: string | null;
  print_customer_note?: boolean | null;
  customer_acknowledged?: boolean | null;
  show_on_thermal?: boolean | null;
  show_on_a4?: boolean | null;
  show_signature_line?: boolean | null;
  /** Final printed customer message, variables already resolved. */
  customer_message?: string | null;
  short_exclusions?: string | null;
  show_terms_on_request?: boolean | null;
  terms_on_request_text?: string | null;
};

/** Variables staff can drop into a customer message template. */
export const TERMS_VARIABLES = [
  "{{customer_name}}",
  "{{device_model}}",
  "{{warranty_days}}",
  "{{warranty_expiry}}",
  "{{amount}}",
] as const;


export const TERMS_TYPES: { type: TermsType; label: string }[] = [
  { type: "REPAIR", label: "Repair terms" },
  { type: "PURCHASE", label: "Purchase terms" },
  { type: "SALES", label: "Sales terms (pre-owned)" },
  { type: "NEW_PHONE", label: "New phone terms" },
];

export const WARRANTY_DAY_OPTIONS = [
  { value: "0", label: "No warranty" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "12 months" },
] as const;

const joinParts = (parts: (string | null | undefined)[]) =>
  parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n\n");

/** Compose the staff-facing draft from a template. */
export function draftFromSettings(settings: TermsSettings): TermsDraft {
  const extras =
    settings.type === "PURCHASE"
      ? [
          settings.seller_declaration,
          settings.payment_ack_text,
          settings.id_verification_note,
        ]
      : settings.type === "SALES"
        ? [settings.battery_disclaimer, settings.returns_policy]
        : settings.type === "NEW_PHONE"
          ? [
              settings.manufacturer_note,
              settings.doa_days > 0
                ? `Dead-on-arrival exchange within ${settings.doa_days} days.`
                : "",
              settings.activation_note,
              settings.accessories_note,
            ]
          : [];

  return {
    warranty_days: settings.enable_warranty ? settings.default_warranty_days : 0,
    warranty_title: settings.warranty_title,
    warranty_text: settings.enable_warranty ? settings.warranty_text : "",
    terms_text: joinParts([settings.default_terms, ...extras]),
    exclusions_text: settings.exclusions_text,
    footer_note: settings.footer_note,
    additional_terms: "",
    internal_note: "",
    customer_note: "",
    print_customer_note: true,
    customer_acknowledged: false,
    include_exclusions: Boolean(settings.exclusions_text.trim()),
    customer_message: settings.customer_message ?? "",

  };
}

/** Warranty expiry as an ISO date string, or null when there is no warranty. */
export function warrantyExpiry(days: number, from: Date = new Date()): string | null {
  if (!days || days <= 0) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The staff-edited terms copy, ready to embed in a counter create payload. */
export function termsDraftPayload(
  type: TermsType,
  draft: TermsDraft,
  settings: TermsSettings | undefined,
): Record<string, unknown> {
  return {
    invoice_type: type,
    warranty_days: draft.warranty_days,
    warranty_title: draft.warranty_title,
    warranty_text: draft.warranty_days > 0 ? draft.warranty_text : "",
    terms_text: draft.terms_text,
    exclusions_text: draft.include_exclusions ? draft.exclusions_text : "",
    footer_note: draft.footer_note,
    additional_terms: draft.additional_terms,
    internal_note: draft.internal_note,
    customer_note: draft.customer_note,
    print_customer_note: draft.print_customer_note,
    customer_acknowledged: draft.customer_acknowledged,
    show_on_thermal: settings?.show_on_thermal ?? true,
    show_on_a4: settings?.show_on_a4 ?? true,
    show_signature_line: settings?.show_signature_line ?? false,
    customer_message: draft.customer_message,

  };
}

/** Payload for the `attach_invoice_terms` workflow. */
export function termsPayload(
  invoiceId: string,
  type: TermsType,
  draft: TermsDraft,
  settings: TermsSettings | undefined,
): Record<string, unknown> {
  return { invoice_id: invoiceId, ...termsDraftPayload(type, draft, settings) };
}

/** Client-side preview of the customer message (server does the final render). */
export function renderCustomerMessage(
  template: string,
  vars: Partial<Record<"customer_name" | "device_model" | "warranty_days" | "warranty_expiry" | "amount", string>>,
): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key as keyof typeof vars] ?? "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Compose the full printed message: greeting + exclusions + on-request line. */
export function composeCustomerMessage(
  message: string,
  settings: TermsSettings | undefined,
  warrantyDays: number,
): string {
  const parts = [message.trim()];
  const showExclusions =
    (settings?.show_exclusions ?? true) &&
    Boolean(settings?.short_exclusions?.trim()) &&
    (warrantyDays > 0 || settings?.type === "NEW_PHONE");
  if (showExclusions) parts.push(settings!.short_exclusions.trim());
  if (settings?.show_terms_on_request ?? true) {
    parts.push(
      settings?.terms_on_request_text?.trim() ||
        "Full terms and conditions are available on request at the counter.",
    );
  }
  return parts.filter(Boolean).join(" ");
}
