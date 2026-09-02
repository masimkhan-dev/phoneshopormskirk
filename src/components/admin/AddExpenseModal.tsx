import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { callRpc } from "@/lib/admin/db";
import { penceToPounds, poundsToPence } from "@/lib/admin/money";
import type { Expense, ExpenseCategory } from "@/lib/admin/queries";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "RENT", label: "Rent / Rates" },
  { value: "WAGES", label: "Staff Wages / Salary" },
  { value: "UTILITIES", label: "Utilities (Electric / Internet)" },
  { value: "PARTS", label: "Repair Parts" },
  { value: "STOCK_SUPPLIES", label: "Stock & Shop Supplies" },
  { value: "MARKETING", label: "Marketing & Advertising" },
  { value: "TRANSPORT", label: "Transport / Delivery" },
  { value: "SOFTWARE", label: "Software / Subscriptions" },
  { value: "BANK_FEES", label: "Bank / Card Processing Fees" },
  { value: "OTHER", label: "Other Operating Expense" },
];

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function AddExpenseModal({
  open,
  onOpenChange,
  editRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRecord?: Expense | null;
}) {
  const qc = useQueryClient();

  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState<string>("OTHER");
  const [description, setDescription] = useState("");
  const [amountPounds, setAmountPounds] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editRecord) {
        setDate(editRecord.expense_date);
        setCategory(editRecord.category);
        setDescription(editRecord.description);
        setAmountPounds(editRecord.amount_pence ? penceToPounds(editRecord.amount_pence) : "");
        setPaymentMethod(editRecord.payment_method);
        setReference(editRecord.reference ?? "");
        setNotes(editRecord.notes ?? "");
      } else {
        setDate(todayIso());
        setCategory("OTHER");
        setDescription("");
        setAmountPounds("");
        setPaymentMethod("CASH");
        setReference("");
        setNotes("");
      }
      setErrorMsg(null);
    }
  }, [open, editRecord]);

  const amountPence = poundsToPence(amountPounds);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) {
        throw new Error("Description is required.");
      }
      if (amountPence <= 0) {
        throw new Error("Please enter an amount greater than 0.");
      }
      return callRpc("save_expense", {
        p_id: editRecord?.id ?? null,
        p_expense_date: date,
        p_category: category,
        p_description: description.trim(),
        p_amount_pence: amountPence,
        p_payment_method: paymentMethod,
        p_reference: reference.trim() || null,
        p_notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "expenses"] });
      qc.invalidateQueries({ queryKey: ["admin", "daily-sales"] });
      qc.invalidateQueries({ queryKey: ["admin", "day-end"] });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save expense.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editRecord ? "Edit Shop Expense" : "Add Shop Expense"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record shop overheads, utilities, repair parts, or staff wages.
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
            <Field label="Date" htmlFor="exp-date">
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Category" htmlFor="exp-cat">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="exp-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="exp-desc">
            <Input
              id="exp-desc"
              placeholder="e.g. Screen delivery from supplier, Shop electricity"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (£)" htmlFor="exp-amount">
              <Input
                id="exp-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amountPounds}
                onChange={(e) => setAmountPounds(e.target.value)}
                required
              />
            </Field>

            <Field label="Payment Method" htmlFor="exp-method">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="exp-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash (Drawer)</SelectItem>
                  <SelectItem value="CARD">Card / Bank</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Reference / Invoice No." htmlFor="exp-ref">
            <Input
              id="exp-ref"
              placeholder="Optional receipt or invoice reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>

          <Field label="Notes" htmlFor="exp-notes">
            <Textarea
              id="exp-notes"
              rows={2}
              placeholder="Optional additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

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
                "Update Expense"
              ) : (
                "Save Expense"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
