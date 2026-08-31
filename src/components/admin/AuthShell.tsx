import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import logoImg from "@/assets/logo.png";

/** Shared branded frame for every staff authentication screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-admin-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" aria-label="Phone Shop Ormskirk home">
            <img src={logoImg} alt="" className="h-10 w-auto" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
        {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}

/** Password input with a show/hide toggle and correct autocomplete. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength = 8,
  required = true,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
