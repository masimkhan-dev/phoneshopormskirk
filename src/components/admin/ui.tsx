import { Link } from "@tanstack/react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/admin/money";
import { cn } from "@/lib/utils";

/* --------------------------------- layout --------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
  compact = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Counter forms use compact headers so the form fits one screen. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        compact ? "mb-3" : "mb-5",
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "font-extrabold tracking-tight",
            compact ? "text-lg" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "max-w-2xl text-muted-foreground",
              compact ? "text-xs" : "mt-1 text-sm",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-card overflow-hidden", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
          {title && <h2 className="text-sm font-bold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const COL_CLASS = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
} as const;

/** Small branded step chip that guides staff through a counter form. */
export function StepBadge({ step, className }: { step: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[0.65rem] font-extrabold text-primary-foreground",
        className,
      )}
    >
      {step}
    </span>
  );
}

export function FormSection({
  title,
  action,
  children,
  className,
  cols = 2,
  step,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
  /** Optional 1-based step number shown as a branded chip beside the title. */
  step?: number;
}) {
  return (
    <fieldset className={cn("admin-card p-3", className)}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="admin-label flex items-center gap-2">
          {step !== undefined && <StepBadge step={step} />}
          {title}
        </p>
        {action}
      </div>
      <div className={cn("grid gap-x-3 gap-y-2.5", COL_CLASS[cols])}>{children}</div>
    </fieldset>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-semibold">
          {label}
        </Label>
      )}
      {children}
      {hint && <p className="text-[0.7rem] leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------- collapsible optional fields --------------------- */

export function MoreDetails({
  children,
  label = "More details",
  className,
  cols = 3,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("admin-card px-3 py-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="admin-label">{label}</span>
        <span className="text-xs font-bold text-primary">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className={cn("mt-2.5 grid gap-x-3 gap-y-2.5 pb-1", COL_CLASS[cols])}>
          {children}
        </div>
      )}
    </div>
  );
}

/* --------------------------- selects and comboboxes ------------------------ */

export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder = "Select",
  allowEmpty,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
      <SelectTrigger id={id} className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">Not set</SelectItem>}
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Searchable select that still accepts a free-typed value. */
export function ComboBox({
  id,
  value,
  onChange,
  options,
  placeholder = "Select or type",
  emptyLabel = "Press enter to use what you typed",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function commit(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-semibold",
            !value && "text-muted-foreground font-normal",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                const exact = options.find(
                  (o) => o.toLowerCase() === query.trim().toLowerCase(),
                );
                if (!exact) {
                  e.preventDefault();
                  commit(query.trim());
                }
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <span className="text-xs">{emptyLabel}</span>
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o} value={o} onSelect={() => commit(o)}>
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      value === o ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------ action bar -------------------------------- */

export function ActionBar({
  summary,
  children,
  hint,
}: {
  summary: ReactNode;
  children: ReactNode;
  /** Optional keyboard-shortcut hint shown under the live figures (desktop). */
  hint?: ReactNode;
}) {
  return (
    <div className="no-print sticky bottom-0 z-20 -mx-4 mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-admin-border bg-admin-panel/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mr-auto min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm font-bold">
          {summary}
        </div>
        {hint && (
          <div className="mt-0.5 hidden flex-wrap items-center gap-2 text-[0.68rem] text-muted-foreground lg:flex">
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Inline keyboard key hint. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-admin-border bg-surface px-1 py-px font-mono text-[0.65rem] font-bold text-foreground">
      {children}
    </kbd>
  );
}

export function SummaryFigure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "good" | "warn" | "muted";
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="admin-label">{label}</span>
      <span
        className={cn(
          "text-sm font-extrabold tabular-nums transition-colors duration-150",
          tone === "primary" && "text-primary",
          tone === "good" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </span>
  );
}

/* ------------------------- compact form dialog ---------------------------- */

const DIALOG_WIDTH = {
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
} as const;

/**
 * Counter dialog shell: fixed header, one scroll area for the fields (never a
 * page scrollbar) and a sticky action bar that can never cover a field.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  width = "lg",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  footer: ReactNode;
  children: ReactNode;
  width?: keyof typeof DIALOG_WIDTH;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(88vh,44rem)] flex-col gap-0 overflow-hidden p-0",
          DIALOG_WIDTH[width],
        )}
      >
        <DialogHeader className="shrink-0 space-y-0.5 border-b border-admin-border px-4 py-3 text-left">
          <DialogTitle className="text-base font-extrabold tracking-tight">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">{children}</div>
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-admin-border bg-admin-panel px-4 py-2.5">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact multi-column field grid for dialogs. */
export function FieldGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-x-3 gap-y-2.5", COL_CLASS[cols], className)}>{children}</div>
  );
}

/** Checkbox styled as a compact tile so it lines up with inputs in a grid. */
export function CheckTile({
  checked,
  onChange,
  label,
  className,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex h-9 items-center gap-2.5 self-end rounded-md border border-admin-border px-3 text-sm font-semibold",
        disabled ? "opacity-50 cursor-not-allowed bg-muted/40" : "cursor-pointer",
        className,
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => !disabled && onChange(v === true)}
      />
      <span className="truncate">{label}</span>
    </label>
  );
}


/* --------------------------------- badges ---------------------------------- */

const BADGE_TONES = {
  neutral:
    "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60",
  green:
    "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  amber:
    "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  red:
    "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  blue:
    "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
  ink:
    "bg-zinc-800 text-zinc-100 border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100",
} as const;

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider border transition-colors",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const tone = status === "PAID" ? "green" : status === "PARTIAL" ? "amber" : "red";
  const label = status === "PAID" ? "Paid" : status === "PARTIAL" ? "Partial" : "Unpaid";
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

export function RecordStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: keyof typeof BADGE_TONES; label: string }> = {
    OPEN: { tone: "neutral", label: "Open" },
    COMPLETED: { tone: "green", label: "Completed" },
    VOIDED: { tone: "red", label: "Voided" },
    FINAL: { tone: "green", label: "Final" },
    DRAFT: { tone: "amber", label: "Draft" },
    VOID: { tone: "red", label: "Void" },
    IN_STOCK: { tone: "green", label: "In stock" },
    RESERVED: { tone: "amber", label: "Reserved" },
    SOLD: { tone: "ink", label: "Sold" },
    REMOVED: { tone: "neutral", label: "Removed" },
    NEW: { tone: "blue", label: "New" },
    CONTACTED: { tone: "amber", label: "Contacted" },
    CONVERTED: { tone: "green", label: "Converted" },
    CLOSED: { tone: "neutral", label: "Closed" },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status };
  return <StatusBadge tone={entry.tone}>{entry.label}</StatusBadge>;
}

/* ---------------------------------- stats --------------------------------- */

const ICON_TONES = {
  plain: "bg-muted/70 text-muted-foreground border border-border/50",
  brand: "bg-primary/10 text-primary border border-primary/20",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40",
  amber:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40",
  red:
    "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40",
  blue:
    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40",
  slate:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50",
  ink: "bg-zinc-800 text-zinc-100 border border-zinc-700",
} as const;

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "plain",
  size = "default",
  to,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  tone?: "plain" | "brand" | "ink" | "emerald" | "amber" | "red" | "blue" | "slate";
  size?: "default" | "lg";
  to?: string;
}) {
  const isZero = value === "0" || value === "£0.00" || value === "0.00";
  const iconTone = isZero && (tone === "amber" || tone === "red") ? "plain" : tone;

  const body = (
    <div
      className={cn(
        "admin-card group flex h-full flex-col justify-between gap-3 p-3.5 sm:p-4 transition-all duration-150",
        size === "lg" && "p-4 sm:p-5",
        to && "hover:border-primary/40 hover:shadow-soft cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 font-extrabold tracking-tight text-foreground tabular-nums",
              size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
              isZero && "text-muted-foreground/80 font-bold",
            )}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-150 group-hover:scale-105",
              ICON_TONES[iconTone] ?? ICON_TONES.plain,
            )}
          >
            <Icon className="size-4.5" />
          </span>
        )}
      </div>
      {sub && (
        <p className="text-xs text-muted-foreground/80 truncate">
          {sub}
        </p>
      )}
    </div>
  );

  return to ? (
    <Link
      to={to}
      className="block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

/* --------------------------------- tables --------------------------------- */

export function TableShell({
  children,
  className,
  tableClassName,
  minWidth = true,
  stickyHeader = false,
}: {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  minWidth?: boolean | string;
  stickyHeader?: boolean;
}) {
  return (
    <div className={cn("overflow-x-auto scrollbar-hidden", className)}>
      <table
        className={cn(
          "w-full border-collapse text-xs",
          minWidth === true && "min-w-[46rem]",
          typeof minWidth === "string" && minWidth,
          stickyHeader && "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:bg-admin-panel [&_thead_th]:z-10",
          tableClassName,
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "admin-th border-b border-admin-border/80 bg-muted/40 px-3.5 py-2.5 text-left text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-admin-border/50 px-3.5 py-2.5 text-xs align-middle leading-tight text-foreground transition-colors",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("text-center", compact ? "px-4 py-7" : "px-6 py-14")}>
      <p className={cn("font-bold text-foreground", compact ? "text-xs" : "text-sm")}>{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function Money({
  pence,
  className,
}: {
  pence: number | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums font-semibold", className)}>{money(pence)}</span>
  );
}

/* ------------------------------ money input -------------------------------- */

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0.00",
  disabled,
  required,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
        £
      </span>
      <Input
        id={id}
        inputMode="decimal"
        className="h-9 pl-7 tabular-nums"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      />
    </div>
  );
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={value === o.value ? "default" : "outline"}
          className="h-8 rounded-full px-3 text-xs font-bold"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
