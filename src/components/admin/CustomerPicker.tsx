import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customersQuery, type Customer } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";
import { Field } from "./ui";

export type CustomerDraft = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  postcode?: string;
  notes?: string;
};

export function isValidUkPhoneOrEmpty(phone?: string | null): boolean {
  if (!phone || !phone.trim()) return true;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11;
}

export function CustomerPicker({
  value,
  onChange,
  nameLabel = "Name",
  phoneLabel = "Phone (optional)",
  emailLabel = "Email (optional)",
  postcodeLabel = "Postcode (optional)",
  required = false,
}: {
  value: CustomerDraft | null;
  onChange: (value: CustomerDraft | null) => void;
  label?: string; // Kept for backwards compatibility
  optional?: boolean; // Kept for backwards compatibility
  nameLabel?: string;
  phoneLabel?: string;
  emailLabel?: string;
  postcodeLabel?: string;
  required?: boolean;
}) {
  const [activeField, setActiveField] = useState<"name" | "phone" | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const draft: CustomerDraft = value ?? { name: "", phone: "" };
  const phoneDigits = (draft.phone ?? "").replace(/\D/g, "").length;

  const searchQuery =
    activeField === "name"
      ? (draft.name ?? "").trim()
      : activeField === "phone"
        ? (draft.phone ?? "").trim()
        : "";

  const shouldSearch =
    activeField === "name"
      ? searchQuery.length >= 2
      : activeField === "phone"
        ? searchQuery.replace(/\D/g, "").length >= 3
        : false;

  const { data: results = [], isFetching } = useQuery({
    ...customersQuery(searchQuery),
    enabled: dropdownOpen && shouldSearch,
    staleTime: 30_000,
  });

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleFieldChange(field: "name" | "phone" | "email" | "postcode", val: string) {
    const next: CustomerDraft = {
      name: field === "name" ? val : draft.name,
      phone: field === "phone" ? val : draft.phone,
      ...(draft.email || field === "email" ? { email: field === "email" ? val : draft.email } : {}),
      ...(draft.postcode || field === "postcode" ? { postcode: field === "postcode" ? val : draft.postcode } : {}),
      ...(draft.address ? { address: draft.address } : {}),
      ...(draft.notes ? { notes: draft.notes } : {}),
      ...(field !== "name" && field !== "phone" && draft.id ? { id: draft.id } : {}),
    };

    const hasAnyContent = Object.values(next).some(
      (v) => typeof v === "string" && v.trim().length > 0,
    );

    onChange(hasAnyContent ? next : null);
    setDropdownOpen(true);
  }

  function handlePhoneInput(rawVal: string) {
    // Allow digits, spaces, and standard phone symbols, but cap digits at 11
    let digitCount = 0;
    let filtered = "";
    for (const char of rawVal) {
      if (/\d/.test(char)) {
        if (digitCount < 11) {
          digitCount++;
          filtered += char;
        }
      } else if (char === " " || char === "+" || char === "(" || char === ")" || char === "-") {
        filtered += char;
      }
    }
    handleFieldChange("phone", filtered);
  }

  function selectCustomer(c: Customer) {
    const selected: CustomerDraft = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      ...(c.email ? { email: c.email } : {}),
      ...(c.address ? { address: c.address } : {}),
      ...(c.postcode ? { postcode: c.postcode } : {}),
      ...(c.notes ? { notes: c.notes } : {}),
    };
    onChange(selected);
    setDropdownOpen(false);
  }

  return (
    <div ref={containerRef} className="space-y-3 sm:col-span-2">
      {draft.id && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <UserCheck className="size-3.5" />
          <span>Existing customer linked</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Name Field with floating autocomplete */}
        <div className="relative">
          <Field label={nameLabel} htmlFor="customer-name">
            <Input
              id="customer-name"
              value={draft.name}
              placeholder="e.g. John Smith"
              autoComplete="name"
              required={required}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              onFocus={() => {
                setActiveField("name");
                setDropdownOpen(true);
              }}
            />
          </Field>

          {activeField === "name" && dropdownOpen && shouldSearch && (
            <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-52 w-full overflow-y-auto rounded-md border border-admin-border bg-popover p-1 shadow-lg scrollbar-hidden">
              {isFetching && !results.length && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Searching customers…</span>
                </div>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCustomer(c);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{c.name}</span>
                    <span className="block truncate text-muted-foreground">{c.phone || "No phone"}</span>
                  </span>
                  {draft.id === c.id && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              ))}
              {!isFetching && !results.length && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No existing customers found.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Phone Field with live digit counter & floating autocomplete */}
        <div className="relative">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="customer-phone" className="text-xs font-semibold">
                {phoneLabel}
              </Label>
              <span
                className={cn(
                  "text-[0.7rem] font-semibold tabular-nums transition-colors",
                  phoneDigits === 11
                    ? "font-bold text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {phoneDigits}/11
              </span>
            </div>
            <div className="relative">
              <Input
                id="customer-phone"
                type="tel"
                inputMode="tel"
                value={draft.phone}
                placeholder="e.g. 07123 456789"
                autoComplete="tel"
                className={cn(
                  phoneDigits === 11 &&
                    "border-emerald-500/60 ring-1 ring-emerald-500/20 focus-visible:ring-emerald-500 pr-8",
                )}
                onChange={(e) => handlePhoneInput(e.target.value)}
                onFocus={() => {
                  setActiveField("phone");
                  setDropdownOpen(true);
                }}
              />
              {phoneDigits === 11 && (
                <Check className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
          </div>

          {activeField === "phone" && dropdownOpen && shouldSearch && (
            <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-52 w-full overflow-y-auto rounded-md border border-admin-border bg-popover p-1 shadow-lg scrollbar-hidden">
              {isFetching && !results.length && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Searching customers…</span>
                </div>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCustomer(c);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{c.name}</span>
                    <span className="block truncate text-muted-foreground">{c.phone}</span>
                  </span>
                  {draft.id === c.id && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              ))}
              {!isFetching && !results.length && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No existing customers with this number.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Email Field */}
        <Field label={emailLabel} htmlFor="customer-email">
          <Input
            id="customer-email"
            type="email"
            inputMode="email"
            value={draft.email ?? ""}
            placeholder="e.g. name@example.com"
            autoComplete="email"
            onChange={(e) => handleFieldChange("email", e.target.value)}
          />
        </Field>

        {/* Postcode Field */}
        <Field label={postcodeLabel} htmlFor="customer-postcode">
          <Input
            id="customer-postcode"
            value={draft.postcode ?? ""}
            placeholder="e.g. L39 3BW"
            autoComplete="postal-code"
            onChange={(e) => handleFieldChange("postcode", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
