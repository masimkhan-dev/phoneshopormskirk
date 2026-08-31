import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { money } from "@/lib/admin/money";
import { globalSearchQuery } from "@/lib/admin/queries";

/** One search box for customers, repairs, stock phones, products, invoices, suppliers. */
export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const { data } = useQuery(globalSearchQuery(term));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  function go(to: string, search?: Record<string, string>) {
    onOpenChange(false);
    setTerm("");
    navigate({ to, search: search as never });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Customer, phone, IMEI, serial, repair or invoice number, SKU…"
        value={term}
        onValueChange={setTerm}
      />
      <CommandList>
        {term.trim().length < 2 ? (
          <CommandEmpty>Type at least two characters to search.</CommandEmpty>
        ) : (
          <CommandEmpty>Nothing matches that search.</CommandEmpty>
        )}

        {!!data?.customers.length && (
          <CommandGroup heading="Customers">
            {data.customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer-${c.id}-${c.name}`}
                onSelect={() => go(`/admin/customers/${c.id}`)}
              >
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-muted-foreground">{c.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.repairs.length && (
          <CommandGroup heading="Repairs">
            {data.repairs.map((r) => (
              <CommandItem
                key={r.id}
                value={`repair-${r.id}-${r.repair_number}`}
                onSelect={() => go("/admin/repairs", { q: r.repair_number })}
              >
                <span className="font-semibold">{r.repair_number}</span>
                <span className="ml-2 text-muted-foreground">
                  {r.device_model ?? "Device"} · {money(r.total_pence)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.stock.length && (
          <CommandGroup heading="Phone stock">
            {data.stock.map((s) => (
              <CommandItem
                key={s.id}
                value={`stock-${s.id}-${s.sku}`}
                onSelect={() => go("/admin/stock", { q: s.imei ?? s.sku })}
              >
                <span className="font-semibold">
                  {s.brand} {s.model}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {s.imei ?? s.sku} · {s.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.products.length && (
          <CommandGroup heading="Products">
            {data.products.map((p) => (
              <CommandItem
                key={p.id}
                value={`product-${p.id}-${p.name}`}
                onSelect={() => go("/admin/products", { q: p.name })}
              >
                <span className="font-semibold">{p.name}</span>
                <span className="ml-2 text-muted-foreground">
                  {p.sku ?? "No SKU"} · {p.quantity} in stock
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.invoices.length && (
          <CommandGroup heading="Invoices">
            {data.invoices.map((i) => (
              <CommandItem
                key={i.id}
                value={`invoice-${i.id}-${i.invoice_number}`}
                onSelect={() => go(`/admin/invoices/${i.id}`)}
              >
                <span className="font-semibold">{i.invoice_number}</span>
                <span className="ml-2 text-muted-foreground">{money(i.total_pence)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!!data?.suppliers.length && (
          <CommandGroup heading="Suppliers">
            {data.suppliers.map((s) => (
              <CommandItem
                key={s.id}
                value={`supplier-${s.id}-${s.name}`}
                onSelect={() => go("/admin/suppliers", { q: s.name })}
              >
                <span className="font-semibold">{s.name}</span>
                {s.company && <span className="ml-2 text-muted-foreground">{s.company}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
