import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const KEY = "pso-cookie-consent";

export type ConsentValue = "accepted" | "essential";

/** Read the stored choice (browser only). */
export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(KEY);
  return value === "accepted" || value === "essential" ? value : null;
}

/**
 * UK cookie banner. Non-essential scripts must only be loaded after
 * "accepted" is stored, so nothing tracking-related runs by default.
 */
export function CookieConsent() {
  const [choice, setChoice] = useState<ConsentValue | null | undefined>(undefined);

  useEffect(() => setChoice(readConsent()), []);

  function decide(value: ConsentValue) {
    window.localStorage.setItem(KEY, value);
    window.dispatchEvent(new CustomEvent("pso-consent", { detail: value }));
    setChoice(value);
  }

  if (choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-20 z-[60] rounded-xl border border-border bg-card p-5 shadow-lift lg:inset-x-auto lg:bottom-5 lg:left-5 lg:max-w-md"
    >
      <h2 className="text-sm font-extrabold">Cookies on this site</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We use essential cookies to make the site work. We'd also like to use analytics cookies to
        understand how people use the site. Nothing non-essential is set unless you agree.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="press inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => decide("essential")}
          className="press inline-flex rounded-md border border-input bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-accent"
        >
          Essential only
        </button>
        <Link
          to="/cookies"
          className="inline-flex items-center px-2 py-2.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Cookie policy
        </Link>
      </div>
    </div>
  );
}
