import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AddExpenseModal } from "@/components/admin/AddExpenseModal";
import {
  EmptyState,
  Field,
  Money,
  PageHeader,
  Section,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/useAdminSession";
import { downloadCsv } from "@/lib/admin/csv";
import { callRpc } from "@/lib/admin/db";
import { money, penceToPounds } from "@/lib/admin/money";
import { expensesQuery, type Expense } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/expenses")({
  component: ExpensesPage,
});

function getMonthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function getToday(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent / Rates",
  WAGES: "Staff Wages",
  UTILITIES: "Utilities",
  PARTS: "Repair Parts",
  STOCK_SUPPLIES: "Stock / Supplies",
  MARKETING: "Marketing",
  TRANSPORT: "Transport",
  SOFTWARE: "Software",
  BANK_FEES: "Bank Fees",
  OTHER: "Other",
};

function ExpensesPage() {
  const qc = useQueryClient();
  const { data: session } = useAdminSession();
  const isManager = session?.roles.some((r) => r === "OWNER" || r === "ADMIN");

  const [from, setFrom] = useState(getMonthStart());
  const [to, setTo] = useState(getToday());
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Expense | null>(null);

  const { data: rawExpenses = [], isLoading } = useQuery(expensesQuery(from, to));

  const expenses = useMemo(() => {
    let list = rawExpenses;
    if (categoryFilter !== "ALL") {
      list = list.filter((e) => e.category === categoryFilter);
    }
    if (methodFilter !== "ALL") {
      list = list.filter((e) => e.payment_method === methodFilter);
    }
    return list;
  }, [rawExpenses, categoryFilter, methodFilter]);

  const activeExpenses = useMemo(() => {
    return expenses.filter((e) => e.status === "ACTIVE");
  }, [expenses]);

  const totalAmountPence = useMemo(() => {
    return activeExpenses.reduce((sum, e) => sum + e.amount_pence, 0);
  }, [activeExpenses]);

  // Breakdown by category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of activeExpenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount_pence;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeExpenses]);

  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      const reason = window.prompt("Reason for voiding this expense:") || "Voided by manager";
      return callRpc("void_expense", { p_id: id, p_reason: reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "expenses"] });
      qc.invalidateQueries({ queryKey: ["admin", "daily-sales"] });
      qc.invalidateQueries({ queryKey: ["admin", "day-end"] });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : "Failed to void expense.");
    },
  });

  const exportCsv = () => {
    const rows = expenses.map((e) => [
      e.expense_date,
      CATEGORY_LABELS[e.category] || e.category,
      e.description,
      e.payment_method,
      penceToPounds(e.amount_pence),
      e.reference ?? "",
      e.notes ?? "",
      e.status,
      new Date(e.created_at).toLocaleString("en-GB"),
    ]);

    downloadCsv(
      `expenses-${from}-to-${to}.csv`,
      [
        "Date",
        "Category",
        "Description",
        "Payment Method",
        "Amount (£)",
        "Reference",
        "Notes",
        "Status",
        "Created At",
      ],
      rows,
    );
  };

  return (
    <div className="space-y-4">
      <div className="no-print space-y-4">
        <PageHeader
          title="Shop Expenses"
          description="Detailed overheads, staff wages, parts purchases, and utility expenses."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditRecord(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add Expense
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1.5 size-4" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 size-4" /> Print
              </Button>
            </div>
          }
        />

        {/* Filter bar */}
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">From:</span>
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">To:</span>
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Category:</span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Method:</span>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card / Bank</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Expenses Table */}
      <Section
        title={`Expenses (${from} to ${to})`}
        action={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Active:{" "}
              <strong className="text-destructive font-bold text-sm">
                {money(totalAmountPence)}
              </strong>
            </span>
          </div>
        }
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            description="Add your first shop expense using the button above."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditRecord(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add Expense
              </Button>
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-admin-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Method</Th>
                <Th className="text-right">Amount</Th>
                <Th>Reference</Th>
                <Th>Status</Th>
                <Th className="no-print w-12 text-center">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border text-sm">
              {expenses.map((e) => {
                const isVoided = e.status === "VOIDED";

                return (
                  <tr
                    key={e.id}
                    className={`transition-colors ${
                      isVoided
                        ? "bg-muted/50 text-muted-foreground line-through opacity-70"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <Td className="font-medium whitespace-nowrap">
                      {new Date(e.expense_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Td>
                    <Td className="font-medium">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                        {CATEGORY_LABELS[e.category] || e.category}
                      </span>
                    </Td>
                    <Td className="font-medium text-foreground">{e.description}</Td>
                    <Td className="text-xs text-muted-foreground">{e.payment_method}</Td>
                    <Td className="text-right font-bold text-destructive">
                      {money(e.amount_pence)}
                    </Td>
                    <Td className="text-xs text-muted-foreground">{e.reference || "—"}</Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isVoided
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {e.status}
                      </span>
                    </Td>
                    <Td className="no-print text-center">
                      {!isVoided && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditRecord(e);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 size-4" /> Edit
                            </DropdownMenuItem>
                            {isManager && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => voidMutation.mutate(e.id)}
                              >
                                <Trash2 className="mr-2 size-4" /> Void Expense
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </Section>

      {/* Category Breakdown Cards */}
      {categoryBreakdown.length > 0 && (
        <div className="admin-card p-4 space-y-3">
          <h3 className="text-sm font-bold tracking-tight">Expenses by Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoryBreakdown.map(([cat, amt]) => (
              <div
                key={cat}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div className="text-xs font-medium text-muted-foreground truncate">
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                <div className="mt-1 text-base font-bold text-destructive">
                  {money(amt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AddExpenseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editRecord={editRecord}
      />
    </div>
  );
}
