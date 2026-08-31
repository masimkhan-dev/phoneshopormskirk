import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "./db";
import { normalisePhone, periodStart } from "./money";
import type { InvoiceTermsSnapshot, TermsSettings } from "@/lib/admin/terms";

function unwrap<T>({ data, error }: { data: unknown; error: unknown }): T {
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as T;
}

export type InvoiceTerms = InvoiceTermsSnapshot & {
  id: string;
  invoice_id: string;
  internal_note: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  postcode: string | null;
  notes: string | null;
  created_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  kind: "REPAIR" | "PHONE_PURCHASE" | "PHONE_SALE" | "PRODUCT_SALE";
  status: "DRAFT" | "FINAL" | "VOID";
  customer_id: string | null;
  subtotal_pence: number;
  discount_pence: number;
  total_pence: number;
  amount_paid_pence: number;
  balance_pence: number;
  payment_status: "UNPAID" | "PARTIAL" | "PAID";
  snapshot: Record<string, unknown>;
  notes: string | null;
  void_reason: string | null;
  refunded_pence: number;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
};

export type RepairInvoice = {
  id: string;
  repair_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  device_brand: string | null;
  device_model: string | null;
  imei: string | null;
  serial: string | null;
  fault: string;
  repair_description: string | null;
  device_condition: string | null;
  accessories_received: string | null;
  subtotal_pence: number;
  discount_pence: number;
  total_pence: number;
  amount_paid_pence: number;
  balance_pence: number;
  payment_status: "UNPAID" | "PARTIAL" | "PAID";
  record_status: "OPEN" | "COMPLETED" | "VOIDED";
  customer_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  customers?: { name: string; phone: string } | null;
};

export type StockItem = {
  id: string;
  sku: string;
  brand: string | null;
  model: string | null;
  imei: string | null;
  serial: string | null;
  storage: string | null;
  colour: string | null;
  network: string | null;
  condition: string | null;
  battery_health: string | null;
  purchase_cost_pence: number;
  selling_price_pence: number | null;
  source: string | null;
  purchase_reference: string | null;
  status: "IN_STOCK" | "RESERVED" | "SOLD" | "REMOVED" | "VOIDED";
  public_visibility: boolean;
  featured: boolean;
  notes: string | null;
  created_at: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  price_pence: number | null;
  cost_price_pence: number;
  quantity: number;
  reorder_level: number;
  brand: string | null;
  model: string | null;
  condition: string | null;
  public_visible: boolean;
  featured: boolean;
  active: boolean;
  created_at: string;
  product_categories?: { name: string } | null;
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount_pence: number;
  method: string;
  direction: "IN" | "OUT";
  reference: string | null;
  notes: string | null;
  is_reversal: boolean;
  created_at: string;
  invoices?: { invoice_number: string; kind: string } | null;
};

/* -------------------------------- customers ------------------------------ */

export const customersQuery = (search: string) =>
  queryOptions({
    queryKey: ["admin", "customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("id,name,phone,email,address,postcode,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      const term = search.trim();
      if (term) {
        const digits = normalisePhone(term);
        const parts = [`name.ilike.%${term}%`, `email.ilike.%${term}%`];
        if (digits) parts.push(`phone_normalized.ilike.%${digits}%`);
        q = q.or(parts.join(","));
      }
      return unwrap<Customer[]>(await q);
    },
  });

export const customerQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "customer", id],
    queryFn: async () =>
      unwrap<Customer>(
        await supabase.from("customers").select("*").eq("id", id).single(),
      ),
  });

export const customerActivityQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "customer-activity", id],
    queryFn: async () => {
      const [repairs, invoices, ledger] = await Promise.all([
        supabase
          .from("repair_invoices")
          .select("*")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("*")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("customer_ledger_entries")
          .select("*")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return {
        repairs: unwrap<RepairInvoice[]>(repairs),
        invoices: unwrap<Invoice[]>(invoices),
        ledger: unwrap<
          {
            id: string;
            entry_type: string;
            debit_pence: number;
            credit_pence: number;
            reference: string | null;
            note: string | null;
            created_at: string;
          }[]
        >(ledger),
      };
    },
  });

/* -------------------------------- suppliers ------------------------------ */

export const suppliersQuery = (search: string) =>
  queryOptions({
    queryKey: ["admin", "suppliers", search],
    queryFn: async () => {
      let q = supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search.trim()) {
        q = q.or(
          `name.ilike.%${search.trim()}%,company.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`,
        );
      }
      return unwrap<Supplier[]>(await q);
    },
  });

/* --------------------------------- repairs -------------------------------- */

export type RepairFilter = {
  search: string;
  period: "all" | "today" | "week" | "month";
  payment: "all" | "UNPAID" | "PARTIAL" | "PAID";
  status: "all" | "OPEN" | "COMPLETED" | "VOIDED";
};

export const repairsQuery = (filter: RepairFilter) =>
  queryOptions({
    queryKey: ["admin", "repairs", filter],
    queryFn: async () => {
      let q = supabase
        .from("repair_invoices")
        .select("*, customers(name, phone)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter.period !== "all") q = q.gte("created_at", periodStart(filter.period));
      if (filter.payment !== "all") q = q.eq("payment_status", filter.payment);
      if (filter.status !== "all") q = q.eq("record_status", filter.status);
      const term = filter.search.trim();
      if (term) {
        q = q.or(
          [
            `repair_number.ilike.%${term}%`,
            `imei.ilike.%${term}%`,
            `serial.ilike.%${term}%`,
            `device_model.ilike.%${term}%`,
            `device_brand.ilike.%${term}%`,
            `fault.ilike.%${term}%`,
          ].join(","),
        );
      }
      return unwrap<RepairInvoice[]>(await q);
    },
  });

export const repairQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "repair", id],
    queryFn: async () =>
      unwrap<RepairInvoice & { customers: Customer | null }>(
        await supabase
          .from("repair_invoices")
          .select("*, customers(*)")
          .eq("id", id)
          .single(),
      ),
  });

/* ---------------------------------- stock --------------------------------- */

export type StockFilter = {
  search: string;
  status: "all" | StockItem["status"];
  brand: string;
  condition: string;
  publicOnly: boolean;
};

export const stockQuery = (filter: StockFilter) =>
  queryOptions({
    queryKey: ["admin", "stock", filter],
    queryFn: async () => {
      let q = supabase
        .from("stock_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter.status !== "all") q = q.eq("status", filter.status);
      if (filter.brand) q = q.eq("brand", filter.brand);
      if (filter.condition) q = q.eq("condition", filter.condition);
      if (filter.publicOnly) q = q.eq("public_visibility", true);
      const term = filter.search.trim();
      if (term) {
        q = q.or(
          [
            `imei.ilike.%${term}%`,
            `sku.ilike.%${term}%`,
            `serial.ilike.%${term}%`,
            `model.ilike.%${term}%`,
            `brand.ilike.%${term}%`,
          ].join(","),
        );
      }
      return unwrap<StockItem[]>(await q);
    },
  });

export const availableStockQuery = (search: string) =>
  queryOptions({
    queryKey: ["admin", "stock-available", search],
    queryFn: async () => {
      let q = supabase
        .from("stock_items")
        .select("*")
        .in("status", ["IN_STOCK", "RESERVED"])
        .order("created_at", { ascending: false })
        .limit(25);
      const term = search.trim();
      if (term) {
        q = q.or(
          [
            `imei.ilike.%${term}%`,
            `sku.ilike.%${term}%`,
            `model.ilike.%${term}%`,
            `brand.ilike.%${term}%`,
          ].join(","),
        );
      }
      return unwrap<StockItem[]>(await q);
    },
  });

/* -------------------------------- products -------------------------------- */

export const adminProductsQuery = (search: string, includeArchived = false) =>
  queryOptions({
    queryKey: ["admin", "products", search, includeArchived],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*, product_categories(name)")
        .order("name")
        .limit(200);
      if (!includeArchived) q = q.eq("active", true);
      if (search.trim()) {
        q = q.or(
          `name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%`,
        );
      }
      return unwrap<AdminProduct[]>(await q);
    },
  });

export const categoriesQuery = queryOptions({
  queryKey: ["admin", "categories"],
  queryFn: async () =>
    unwrap<{ id: string; name: string }[]>(
      await supabase.from("product_categories").select("id,name").order("name"),
    ),
});

/* -------------------------------- invoices -------------------------------- */

export type InvoiceFilter = {
  search: string;
  kind: "all" | Invoice["kind"];
  status: "all" | Invoice["status"];
  period: "all" | "today" | "week" | "month";
};

export const invoicesQuery = (filter: InvoiceFilter) =>
  queryOptions({
    queryKey: ["admin", "invoices", filter],
    queryFn: async () => {
      let q = supabase
        .from("invoices")
        .select("*, customers(name, phone)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter.kind !== "all") q = q.eq("kind", filter.kind);
      if (filter.status !== "all") q = q.eq("status", filter.status);
      if (filter.period !== "all") q = q.gte("created_at", periodStart(filter.period));
      if (filter.search.trim()) {
        q = q.ilike("invoice_number", `%${filter.search.trim()}%`);
      }
      return unwrap<(Invoice & { customers: { name: string; phone: string } | null })[]>(
        await q,
      );
    },
  });

export const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "invoice", id],
    queryFn: async () => {
      const invoice = unwrap<Invoice & { customers: Customer | null }>(
        await supabase.from("invoices").select("*, customers(*)").eq("id", id).single(),
      );
      const [items, payments, terms] = await Promise.all([
        supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", id)
          .order("created_at"),
        supabase
          .from("payments")
          .select("*")
          .eq("invoice_id", id)
          .order("created_at"),
        supabase
          .from("invoice_terms")
          .select("*")
          .eq("invoice_id", id)
          .maybeSingle(),
      ]);
      return {
        invoice,
        items: unwrap<
          {
            id: string;
            description: string;
            quantity: number;
            unit_price_pence: number;
            line_total_pence: number;
            meta: Record<string, unknown>;
          }[]
        >(items),
        payments: unwrap<Payment[]>(payments),
        terms: (terms.data ?? null) as InvoiceTerms | null,
      };
    },
  });

export const termsSettingsQuery = queryOptions({
  queryKey: ["admin", "invoice-terms-settings"],
  queryFn: async () =>
    unwrap<TermsSettings[]>(
      await supabase.from("invoice_terms_settings").select("*").order("type"),
    ),
});

export const paymentsQuery = (period: "today" | "week" | "month" | "all") =>
  queryOptions({
    queryKey: ["admin", "payments", period],
    queryFn: async () => {
      let q = supabase
        .from("payments")
        .select("*, invoices(invoice_number, kind)")
        .order("created_at", { ascending: false })
        .limit(150);
      if (period !== "all") q = q.gte("created_at", periodStart(period));
      return unwrap<Payment[]>(await q);
    },
  });

/* -------------------------------- enquiries ------------------------------- */

export type Enquiry = {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  status: "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";
  created_at: string;
};

export const enquiriesQuery = (status: "all" | Enquiry["status"]) =>
  queryOptions({
    queryKey: ["admin", "enquiries", status],
    queryFn: async () => {
      let q = supabase
        .from("website_enquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (status !== "all") q = q.eq("status", status);
      return unwrap<Enquiry[]>(await q);
    },
  });

/* -------------------------------- dashboard ------------------------------- */

export const dashboardQuery = queryOptions({
  queryKey: ["admin", "dashboard"],
  queryFn: async () => {
    const todayStart = periodStart("today");
    const monthStart = periodStart("month");

    const [
      invoicesToday,
      repairsToday,
      salesToday,
      purchasesToday,
      paymentsToday,
      stock,
      lowStock,
      outstanding,
      recentRepairs,
      recentSales,
      recentPurchases,
      recentPayments,
      recentEnquiries,
      monthInvoices,
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,kind,total_pence,created_at")
        .eq("status", "FINAL")
        .gte("created_at", todayStart),
      supabase
        .from("repair_invoices")
        .select("id,total_pence")
        .neq("record_status", "VOIDED")
        .gte("created_at", todayStart),
      supabase
        .from("sales")
        .select("id,sale_kind,total_pence")
        .eq("record_status", "COMPLETED")
        .gte("created_at", todayStart),
      supabase
        .from("phone_purchases")
        .select("id,total_pence")
        .eq("record_status", "COMPLETED")
        .gte("created_at", todayStart),
      supabase
        .from("payments")
        .select("amount_pence,method,direction")
        .gte("created_at", todayStart),
      supabase
        .from("stock_items")
        .select("id,purchase_cost_pence")
        .eq("status", "IN_STOCK"),
      supabase
        .from("products")
        .select("id,name,quantity,reorder_level")
        .eq("active", true),
      supabase
        .from("invoices")
        .select("balance_pence")
        .eq("status", "FINAL")
        .gt("balance_pence", 0),
      supabase
        .from("repair_invoices")
        .select("*, customers(name, phone)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("sales")
        .select("*, invoices(invoice_number), customers(name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("phone_purchases")
        .select("*, invoices(invoice_number), customers:seller_customer_id(name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payments")
        .select("*, invoices(invoice_number, kind)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("website_enquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("invoices")
        .select("kind,total_pence,created_at")
        .eq("status", "FINAL")
        .gte("created_at", monthStart),
    ]);

    const inv = unwrap<{ kind: string; total_pence: number; created_at: string }[]>(
      invoicesToday,
    );
    const sales = unwrap<{ sale_kind: string; total_pence: number }[]>(salesToday);
    const pays = unwrap<{ amount_pence: number; method: string; direction: string }[]>(
      paymentsToday,
    );
    const stockRows = unwrap<{ purchase_cost_pence: number }[]>(stock);
    const products = unwrap<
      { id: string; name: string; quantity: number; reorder_level: number }[]
    >(lowStock);
    const repairsRows = unwrap<{ total_pence: number }[]>(repairsToday);
    const purchaseRows = unwrap<{ total_pence: number }[]>(purchasesToday);

    const revenueToday = inv
      .filter((i) => i.kind !== "PHONE_PURCHASE")
      .reduce((sum, i) => sum + i.total_pence, 0);

    return {
      revenueToday,
      salesCountToday: sales.length,
      repairRevenueToday: repairsRows.reduce((s, r) => s + r.total_pence, 0),
      repairCountToday: repairsRows.length,
      phonesBoughtToday: purchaseRows.length,
      purchaseSpendToday: purchaseRows.reduce((s, p) => s + p.total_pence, 0),
      phonesSoldToday: sales.filter((s) => s.sale_kind === "PHONE").length,
      productSalesToday: sales.filter((s) => s.sale_kind === "PRODUCT").length,
      stockCount: stockRows.length,
      stockValue: stockRows.reduce((s, r) => s + r.purchase_cost_pence, 0),
      lowStockProducts: products.filter(
        (p) => p.reorder_level > 0 && p.quantity <= p.reorder_level,
      ),
      outstandingTotal: unwrap<{ balance_pence: number }[]>(outstanding).reduce(
        (s, r) => s + r.balance_pence,
        0,
      ),
      paymentBreakdown: pays.reduce<Record<string, number>>((acc, p) => {
        const sign = p.direction === "IN" ? 1 : -1;
        acc[p.method] = (acc[p.method] ?? 0) + sign * p.amount_pence;
        return acc;
      }, {}),
      monthTrend: unwrap<{ kind: string; total_pence: number; created_at: string }[]>(
        monthInvoices,
      ),
      recentRepairs: unwrap<RepairInvoice[]>(recentRepairs),
      recentSales: unwrap<
        {
          id: string;
          sale_kind: string;
          total_pence: number;
          created_at: string;
          invoices: { invoice_number: string } | null;
          customers: { name: string } | null;
        }[]
      >(recentSales),
      recentPurchases: unwrap<
        {
          id: string;
          total_pence: number;
          created_at: string;
          invoices: { invoice_number: string } | null;
          customers: { name: string } | null;
        }[]
      >(recentPurchases),
      recentPayments: unwrap<Payment[]>(recentPayments),
      recentEnquiries: unwrap<Enquiry[]>(recentEnquiries),
    };
  },
});

/* ------------------------------ global search ----------------------------- */

export const globalSearchQuery = (term: string) =>
  queryOptions({
    queryKey: ["admin", "global-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const t = term.trim();
      const digits = normalisePhone(t);
      const [customers, repairs, stock, products, invoices, suppliers] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id,name,phone")
            .or(
              [
                `name.ilike.%${t}%`,
                digits ? `phone_normalized.ilike.%${digits}%` : `email.ilike.%${t}%`,
              ].join(","),
            )
            .limit(5),
          supabase
            .from("repair_invoices")
            .select("id,repair_number,device_model,total_pence")
            .or(
              [
                `repair_number.ilike.%${t}%`,
                `imei.ilike.%${t}%`,
                `serial.ilike.%${t}%`,
                `device_model.ilike.%${t}%`,
              ].join(","),
            )
            .limit(5),
          supabase
            .from("stock_items")
            .select("id,sku,brand,model,imei,status")
            .or(
              [
                `imei.ilike.%${t}%`,
                `sku.ilike.%${t}%`,
                `serial.ilike.%${t}%`,
                `model.ilike.%${t}%`,
              ].join(","),
            )
            .limit(5),
          supabase
            .from("products")
            .select("id,name,sku,quantity")
            .or(`name.ilike.%${t}%,sku.ilike.%${t}%`)
            .limit(5),
          supabase
            .from("invoices")
            .select("id,invoice_number,kind,total_pence")
            .ilike("invoice_number", `%${t}%`)
            .limit(5),
          supabase
            .from("suppliers")
            .select("id,name,company")
            .or(`name.ilike.%${t}%,company.ilike.%${t}%`)
            .limit(5),
        ]);
      return {
        customers: unwrap<{ id: string; name: string; phone: string }[]>(customers),
        repairs: unwrap<
          { id: string; repair_number: string; device_model: string | null; total_pence: number }[]
        >(repairs),
        stock: unwrap<
          {
            id: string;
            sku: string;
            brand: string | null;
            model: string | null;
            imei: string | null;
            status: string;
          }[]
        >(stock),
        products: unwrap<{ id: string; name: string; sku: string | null; quantity: number }[]>(
          products,
        ),
        invoices: unwrap<
          { id: string; invoice_number: string; kind: string; total_pence: number }[]
        >(invoices),
        suppliers: unwrap<{ id: string; name: string; company: string | null }[]>(
          suppliers,
        ),
      };
    },
  });

/* --------------------------------- reports -------------------------------- */

export const reportsQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["admin", "reports", from, to],
    queryFn: async () => {
      const [invoices, sales, saleItems, repairs, purchases, payments, stock, products] =
        await Promise.all([
          supabase
            .from("invoices")
            .select("id,kind,status,total_pence,discount_pence,balance_pence,created_at")
            .gte("created_at", from)
            .lte("created_at", to),
          supabase
            .from("sales")
            .select("id,sale_kind,total_pence,discount_pence,cost_pence,record_status,created_at")
            .gte("created_at", from)
            .lte("created_at", to),
          supabase
            .from("sale_items")
            .select("quantity,line_total_pence,unit_cost_pence,created_at")
            .gte("created_at", from)
            .lte("created_at", to),
          supabase
            .from("repair_invoices")
            .select(
              "id,fault,total_pence,balance_pence,payment_status,record_status,created_at",
            )
            .gte("created_at", from)
            .lte("created_at", to),
          supabase
            .from("phone_purchases")
            .select("id,total_pence,record_status,created_at")
            .gte("created_at", from)
            .lte("created_at", to),
          supabase
            .from("payments")
            .select("amount_pence,method,direction,created_at")
            .gte("created_at", from)
            .lte("created_at", to),
          supabase
            .from("stock_items")
            .select("id,brand,condition,status,purchase_cost_pence,selling_price_pence,created_at"),
          supabase
            .from("products")
            .select("id,name,quantity,reorder_level,cost_price_pence,price_pence,active"),
        ]);
      return {
        invoices: unwrap<Invoice[]>(invoices),
        sales: unwrap<
          {
            sale_kind: string;
            total_pence: number;
            discount_pence: number;
            cost_pence: number;
            record_status: string;
            created_at: string;
          }[]
        >(sales),
        saleItems: unwrap<
          { quantity: number; line_total_pence: number; unit_cost_pence: number }[]
        >(saleItems),
        repairs: unwrap<
          {
            fault: string;
            total_pence: number;
            balance_pence: number;
            payment_status: string;
            record_status: string;
          }[]
        >(repairs),
        purchases: unwrap<{ total_pence: number; record_status: string }[]>(purchases),
        payments: unwrap<
          { amount_pence: number; method: string; direction: string }[]
        >(payments),
        stock: unwrap<StockItem[]>(stock),
        products: unwrap<AdminProduct[]>(products),
      };
    },
  });

/* ---------------------------- website management --------------------------- */

export const businessSettingsQuery = queryOptions({
  queryKey: ["admin", "business-settings"],
  queryFn: async () =>
    unwrap<Record<string, unknown>>(
      await supabase.from("business_settings").select("*").limit(1).single(),
    ),
});

export const repairServicesAdminQuery = queryOptions({
  queryKey: ["admin", "repair-services"],
  queryFn: async () =>
    unwrap<
      {
        id: string;
        name: string;
        slug: string;
        category: string;
        brand: string | null;
        description: string | null;
        starting_price_pence: number | null;
        public_visible: boolean;
        featured: boolean;
        sort_order: number;
      }[]
    >(
      await supabase
        .from("repair_services")
        .select("*")
        .order("sort_order")
        .order("name"),
    ),
});

export const staffQuery = queryOptions({
  queryKey: ["admin", "staff"],
  queryFn: async () => {
    const [profiles, roles] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const roleRows = unwrap<{ user_id: string; role: string }[]>(roles);
    return unwrap<
      { id: string; full_name: string | null; email: string | null; active: boolean; created_at: string }[]
    >(profiles).map((p) => ({
      ...p,
      role: roleRows.find((r) => r.user_id === p.id)?.role ?? "STAFF",
    }));
  },
});

/* ------------------------------- day end ---------------------------------- */

export const dayEndQuery = (day: string) =>
  queryOptions({
    queryKey: ["admin", "day-end", day],
    queryFn: async () => {
      const start = new Date(`${day}T00:00:00`).toISOString();
      const end = new Date(`${day}T23:59:59.999`).toISOString();
      const [payments, invoices] = await Promise.all([
        supabase
          .from("payments")
          .select("*, invoices(invoice_number, kind)")
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at"),
        supabase
          .from("invoices")
          .select("id,invoice_number,kind,status,total_pence,refunded_pence,created_at")
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at"),
      ]);
      return {
        payments: unwrap<Payment[]>(payments),
        invoices: unwrap<
          Pick<
            Invoice,
            | "id"
            | "invoice_number"
            | "kind"
            | "status"
            | "total_pence"
            | "refunded_pence"
            | "created_at"
          >[]
        >(invoices),
      };
    },
  });
