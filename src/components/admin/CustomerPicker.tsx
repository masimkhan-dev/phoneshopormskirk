import { useQuery } from "@tanstack/react-query";
import { Check, Search, UserPlus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { customersQuery, type Customer } from "@/lib/admin/queries";
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

/**
 * Inline customer search + create, used on every counter screen so staff never
 * have to leave the transaction. Warns about a likely duplicate by phone.
 */
export function CustomerPicker({
  value,
  onChange,
  label = "Customer",
  optional = false,
}: {
  value: CustomerDraft | null;
  onChange: (value: CustomerDraft | null) => void;
  label?: string;
  optional?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft>({ name: "", phone: "" });
  const { data: results = [], isFetching } = useQuery({
    ...customersQuery(search),
    enabled: search.trim().length >= 2 && !value,
  });

  const duplicate =
    creating && draft.phone.length >= 5
      ? results.find(
          (c) => c.phone.replace(/\D/g, "") === draft.phone.replace(/\D/g, ""),
        )
      : undefined;

  function select(c: Customer) {
    onChange({
      id: c.id,
      name: c.name,
      phone: c.phone,
      ...(c.email ? { email: c.email } : {}),
    });
    setSearch("");
    setCreating(false);
  }

  if (value) {
    return (
      <div className="sm:col-span-2">
        {label && <p className="admin-label mb-1.5">{label}</p>}
        <div className="flex items-center justify-between gap-3 rounded-md border border-admin-border bg-surface px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {value.phone}
              {value.email ? ` · ${value.email}` : ""}
              {value.id ? "" : " · new customer"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label="Change customer"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      {label && (
        <p className="admin-label">
          {label}
          {optional && (
            <span className="ml-1 normal-case text-muted-foreground">(optional)</span>
          )}
        </p>
      )}

      {!creating && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Search by name, phone or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim().length >= 2 && (
            <div className="max-h-44 divide-y divide-admin-border overflow-y-auto rounded-md border border-admin-border">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface"
                  onClick={() => select(c)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.phone}
                    </span>
                  </span>
                  <Check className="size-4 text-primary opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {!results.length && (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {isFetching ? "Searching…" : "No customers match your search."}
                </p>
              )}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCreating(true);
              setDraft({ name: "", phone: search.replace(/[^0-9+ ]/g, "").trim() });
            }}
          >
            <UserPlus className="mr-1.5 size-4" /> New customer
          </Button>
        </>
      )}

      {creating && (
        <div className="grid gap-2.5 rounded-md border border-admin-border p-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Name">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Phone">
            <Input
              value={draft.phone}
              inputMode="tel"
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </Field>
          <Field label="Email (optional)">
            <Input
              type="email"
              value={draft.email ?? ""}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </Field>
          <Field label="Postcode (optional)">
            <Input
              value={draft.postcode ?? ""}
              onChange={(e) => setDraft({ ...draft, postcode: e.target.value })}
            />
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2 xl:col-span-4">
            <Textarea
              rows={2}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
          {duplicate && (
            <p className="sm:col-span-2 xl:col-span-4 rounded-md bg-tint px-3 py-2 text-xs font-semibold text-primary">
              {duplicate.name} already uses this number.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => select(duplicate)}
              >
                Use that customer instead
              </button>
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2 xl:col-span-4">
            <Button
              type="button"
              size="sm"
              disabled={!draft.name.trim() || draft.phone.trim().length < 5}
              onClick={() => {
                onChange({ ...draft });
                setCreating(false);
              }}
            >
              Use this customer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
