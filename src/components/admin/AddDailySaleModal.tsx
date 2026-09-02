import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, Loader2, Plus, Receipt } from "lucide-react";
import { useEffect, useState } from "react";

import { AddExpenseModal } from "@/components/admin/AddExpenseModal";
import { Field } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { callRpc } from "@/lib/admin/db";
import { money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import {
  distinctStaffNamesQuery,
  expensesQuery,
  type DailySale,
} from "@/lib/admin/queries";

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function AddDailySaleModal({
  open,
  onOpenChange,
  editRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRecord?: DailySale | null;
}) {
  const qc = useQueryClient();
  const { data: staffSuggestions = [] } = useQuery(distinctStaffNamesQuery);

  const [date, setDate] = useState(todayIso());
  const [staffName, setStaffName] = useState("");
  const [cashPounds, setCashPounds] = useState("");
  const [cardPounds, setCardPounds] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Authoritative dynamic expenses for the selected date
  const { data: dayExpenses = [] } = useQuery(expensesQuery(date, date));
  const activeDayExpensesPence = dayExpenses
    .filter((e) => e.status === "ACTIVE")
    .reduce((sum, e) => sum + e.amount_pence, 0);

  useEffect(() => {
    if (open) {
      if (editRecord) {
        setDate(editRecord.entry_date);
        setStaffName(editRecord.staff_name);
        setCashPounds(editRecord.cash_sale_pence ? penceToPounds(editRecord.cash_sale_pence) : "");
        setCardPounds(editRecord.card_sale_pence ? penceToPounds(editRecord.card_sale_pence) : "");
        setDescription(editRecord.description ?? "");
      } else {
        setDate(todayIso());
        setCashPounds("");
        setCardPounds("");
        setDescription("");
      }
      setErrorMsg(null);
    }
  }, [open, editRecord]);

  const cashPence = poundsToPence(cashPounds);
  const cardPence = poundsToPence(cardPounds);
  const totalSalePence = cashPence + cardPence;
  const netPence = totalSalePence - activeDayExpensesPence;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!staffName.trim()) {
        throw new Error("Staff Name is required.");
      }
      return callRpc("save_daily_sale", {
        p_id: editRecord?.id ?? null,
        p_entry_date: date,
        p_staff_name: staffName.trim(),
        p_cash_pence: cashPence,
        p_card_pence: cardPence,
        p_description: description.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "daily-sales"] });
      qc.invalidateQueries({ queryKey: ["admin", "day-end"] });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save daily sale.");
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editRecord ? "Edit Daily Sales Entry" : "Add Daily Sales Entry"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fast manual recording of daily shop figures. Enter only sales here not already recorded through the POS.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="entry-date">
                <Input
                  id="entry-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>

              <Field label="Staff Name" htmlFor="staff-name">
                <Input
                  id="staff-name"
                  placeholder="e.g. Aftab, Altaf"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
            </div>

            {/* Quick Staff Suggestions */}
            {staffSuggestions.length > 0 && !editRecord && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-muted-foreground">Quick Staff:</span>
                {staffSuggestions.slice(0, 5).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setStaffName(name)}
                    className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                      staffName.toLowerCase() === name.toLowerCase()
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-foreground hover:bg-muted"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cash Sale (£)" htmlFor="cash-sale">
                <Input
                  id="cash-sale"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cashPounds}
                  onChange={(e) => setCashPounds(e.target.value)}
                />
              </Field>

              <Field label="Card Sale (£)" htmlFor="card-sale">
                <Input
                  id="card-sale"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cardPounds}
                  onChange={(e) => setCardPounds(e.target.value)}
                />
              </Field>
            </div>

            {/* Read-Only Authoritative Expenses Preview */}
            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-2.5 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Expense Today ({date}):</span>{" "}
                <span className="font-bold text-destructive">
                  {money(activeDayExpensesPence)}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {dayExpenses.filter((e) => e.status === "ACTIVE").length} active expense record(s) from Expenses module
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setExpenseModalOpen(true)}
              >
                <Plus className="mr-1 size-3" /> Add Expense
              </Button>
            </div>

            <Field label="Description / Notes" htmlFor="description">
              <Textarea
                id="description"
                rows={2}
                placeholder="e.g. Existing stock sales, accessories..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* Real-time Calculation Preview */}
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Total Sale</div>
                  <div className="text-base font-bold text-foreground">
                    {money(totalSalePence)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Expense Today</div>
                  <div className="text-base font-bold text-destructive">
                    {money(activeDayExpensesPence)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Daily Net</div>
                  <div className={`text-base font-extrabold ${netPence >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {money(netPence)}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : editRecord ? (
                  "Update Entry"
                ) : (
                  "Save Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-modal to add expense directly */}
      <AddExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
      />
    </>
  );
}
