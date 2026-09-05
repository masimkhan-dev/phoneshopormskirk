import { cn } from "@/lib/utils";

type PaymentBadgesProps = {
  className?: string;
  variant?: "dark" | "light";
};

/**
 * Cash banknote icon
 */
function CashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9h.01M18 15h.01" />
    </svg>
  );
}

/**
 * Visa official typographic mark
 */
function VisaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 12" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.28 0.65L9.36 12H6.14L3.73 2.6C3.59 2.04 3.42 1.84 2.97 1.6C2.26 1.21 1.06 0.84 0 0.61L0.07 0.25H5.2C5.86 0.25 6.45 0.69 6.59 1.47L7.84 8.09L11.72 0.65H14.28ZM26.85 8.12C26.87 5.01 22.56 4.84 22.6 3.46C22.61 3.04 23.01 2.59 23.95 2.47C24.41 2.41 25.7 2.36 27.13 3.02L27.67 0.5C26.93 0.23 25.97 0 24.77 0C21.75 0 19.61 1.6 19.59 3.88C19.56 5.58 21.08 6.53 22.24 7.1C23.43 7.68 23.83 8.05 23.82 8.57C23.81 9.37 22.86 9.72 21.98 9.73C20.44 9.75 19.54 9.31 18.83 8.98L18.26 11.64C19.08 12.02 20.59 12.35 22.15 12.37C25.34 12.37 27.42 10.8 26.85 8.12ZM34.78 12H37.5L35.13 0.65H32.72C32.17 0.65 31.7 0.97 31.5 1.45L26.91 12H29.95L30.56 10.33H34.27L34.78 12ZM31.4 8.03L32.96 3.74L33.86 8.03H31.4ZM18.73 0.65L16.33 12H13.43L15.83 0.65H18.73Z" />
    </svg>
  );
}

/**
 * Mastercard iconic overlapping circles
 */
function MastercardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="8" fill="#EB001B" />
      <circle cx="19" cy="9" r="8" fill="#F79E1B" fillOpacity="0.95" />
      <path
        d="M14 3.65a7.96 7.96 0 0 1 3 5.35 7.96 7.96 0 0 1-3 5.35 7.96 7.96 0 0 1-3-5.35c0-2.12 1.15-4 3-5.35Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

/**
 * American Express badge
 */
function AmexIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 17" fill="none" className={className} aria-hidden="true">
      <rect width="26" height="17" rx="2.5" fill="#006FCF" />
      <path
        d="M3.8 13L6.3 4.5H8.6L11.1 13H9.1L8.6 11.2H6.3L5.8 13H3.8ZM6.7 9.5H8.2L7.5 6.6L6.7 9.5ZM12 13V4.5H14.4L16.2 9.8L18 4.5H20.4V13H18.5V7.4L16.9 12.1H15.6L14 7.4V13H12ZM21.2 13V4.5H25.4V6.2H23.1V7.9H25.2V9.5H23.1V11.3H25.4V13H21.2Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Contactless standard 4-wave symbol
 */
function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 16a5.5 5.5 0 0 1 0-8" />
      <path d="M10 19a9.5 9.5 0 0 1 0-14" />
      <path d="M13 22a13.5 13.5 0 0 1 0-20" />
      <circle cx="4" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

/**
 * Apple Pay logo
 */
function ApplePayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8.2 4.6c-.4.5-1.1.9-1.8.8-.1-.7.2-1.4.6-1.9.4-.5 1.2-.9 1.8-.8.1.7-.2 1.4-.6 1.9m.6 1c-1 0-1.8.6-2.3.6-.5 0-1.2-.6-2-.6-1 0-2 .6-2.5 1.5-1.1 1.9-.3 4.7.8 6.2.5.8 1.1 1.6 1.9 1.6.8 0 1.1-.5 2.1-.5 1 0 1.3.5 2.1.5.8 0 1.4-.8 2-1.6.6-.9.9-1.8 1-1.9-.1 0-1.9-.7-1.9-2.8 0-1.7 1.4-2.5 1.5-2.6-.8-1.2-2.1-1.3-2.5-1.3l-.7.9z" />
      <path d="M18.8 3.5h2.4v8.8h-1.5V11c-.4.8-1.2 1.4-2.2 1.4-1.8 0-3-1.4-3-3.6s1.2-3.6 3-3.6c1 0 1.8.6 2.2 1.3V3.5h-.9zm-.7 3.9c-1 0-1.7.8-1.7 2.2 0 1.4.7 2.2 1.7 2.2 1 0 1.7-.8 1.7-2.2 0-1.4-.7-2.2-1.7-2.2zM28.4 8.7c0 1-.7 1.7-1.8 1.7-1 0-1.6-.7-1.6-1.5 0-1 .8-1.5 2.1-1.6l1.3-.1v1.5zm1.4-1.2v4.8h-1.4v-.9c-.4.6-1.2 1-2.1 1-1.6 0-2.6-.9-2.6-2.2 0-1.6 1.3-2.4 3.3-2.5l1.4-.1v-.4c0-.7-.5-1.1-1.4-1.1-.8 0-1.3.3-1.6.8l-1.1-.7c.5-.8 1.5-1.3 2.8-1.3 1.8 0 2.7.9 2.7 2.5v.9zM31.2 14.7l1.4-4.2-2.2-5.3h1.6l1.4 3.7 1.4-3.7h1.6l-3.6 8.5h-1.6v1z" />
    </svg>
  );
}

/**
 * Google Pay logo
 */
function GooglePayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M9.8 8.1c0-.5-.04-1-.13-1.5H5v2.8h2.7a2.3 2.3 0 0 1-1 1.5v1.3h1.6c1-.9 1.5-2.3 1.5-4.1z"
        fill="#4285F4"
      />
      <path
        d="M5 13c1.4 0 2.5-.5 3.3-1.3l-1.6-1.3c-.5.3-1 .5-1.7.5-1.3 0-2.4-.9-2.8-2.1H.5v1.3C1.4 11.9 3.1 13 5 13z"
        fill="#34A853"
      />
      <path
        d="M2.2 8.8c-.1-.3-.2-.7-.2-1s.1-.7.2-1V5.5H.5C.2 6.1 0 6.9 0 7.8s.2 1.7.5 2.3l1.7-1.3z"
        fill="#FBBC05"
      />
      <path
        d="M5 4.6c.8 0 1.4.3 1.9.8l1.4-1.4C7.5 3.2 6.3 2.6 5 2.6c-1.9 0-3.6 1.1-4.5 2.9l1.7 1.3C2.6 5.5 3.7 4.6 5 4.6z"
        fill="#EA4335"
      />
      <path
        d="M17.7 3.5h2.4v8.8h-1.5V11c-.4.8-1.2 1.4-2.2 1.4-1.8 0-3-1.4-3-3.6s1.2-3.6 3-3.6c1 0 1.8.6 2.2 1.3V3.5h-.9zm-.7 3.9c-1 0-1.7.8-1.7 2.2 0 1.4.7 2.2 1.7 2.2 1 0 1.7-.8 1.7-2.2 0-1.4-.7-2.2-1.7-2.2zM27.3 8.7c0 1-.7 1.7-1.8 1.7-1 0-1.6-.7-1.6-1.5 0-1 .8-1.5 2.1-1.6l1.3-.1v1.5zm1.4-1.2v4.8h-1.4v-.9c-.4.6-1.2 1-2.1 1-1.6 0-2.6-.9-2.6-2.2 0-1.6 1.3-2.4 3.3-2.5l1.4-.1v-.4c0-.7-.5-1.1-1.4-1.1-.8 0-1.3.3-1.6.8l-1.1-.7c.5-.8 1.5-1.3 2.8-1.3 1.8 0 2.7.9 2.7 2.5v.9zM30.1 14.7l1.4-4.2-2.2-5.3h1.6l1.4 3.7 1.4-3.7h1.6l-3.6 8.5h-1.6v1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PaymentBadges({ className, variant = "dark" }: PaymentBadgesProps) {
  const isDark = variant === "dark";

  const badgeBase = cn(
    "inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[0.72rem] font-semibold tracking-tight leading-none transition-all select-none",
    isDark
      ? "border border-white/14 bg-white/[0.07] text-white/90 hover:bg-white/[0.12] hover:border-white/25 hover:text-white shadow-2xs"
      : "border border-border/80 bg-surface text-foreground hover:bg-muted/70 shadow-2xs",
  );

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2", className)}
      role="list"
      aria-label="Accepted payment methods"
    >
      {/* 1. Cash */}
      <span className={badgeBase} role="listitem" title="Cash accepted">
        <CashIcon className="size-3.5 text-emerald-400 shrink-0" />
        <span>Cash</span>
      </span>

      {/* 2. Visa */}
      <span
        className={cn(badgeBase, isDark ? "text-white" : "text-[#1A1F71]")}
        role="listitem"
        title="Visa accepted"
      >
        <VisaIcon className="h-2.5 w-auto shrink-0" />
        <span className="sr-only">Visa</span>
      </span>

      {/* 3. Mastercard */}
      <span className={badgeBase} role="listitem" title="Mastercard accepted">
        <MastercardIcon className="h-3 w-auto shrink-0" />
        <span>Mastercard</span>
      </span>

      {/* 4. American Express */}
      <span className={badgeBase} role="listitem" title="American Express accepted">
        <AmexIcon className="h-3 w-auto shrink-0 rounded-xs" />
        <span>Amex</span>
      </span>

      {/* 5. Contactless */}
      <span className={badgeBase} role="listitem" title="Contactless payment accepted">
        <ContactlessIcon className="size-3 text-cyan-400 shrink-0" />
        <span>Contactless</span>
      </span>

      {/* 6. Apple Pay */}
      <span className={badgeBase} role="listitem" title="Apple Pay accepted">
        <ApplePayIcon className="h-3 w-auto shrink-0" />
        <span className="sr-only">Apple Pay</span>
      </span>

      {/* 7. Google Pay */}
      <span className={badgeBase} role="listitem" title="Google Pay accepted">
        <GooglePayIcon className="h-3 w-auto shrink-0" />
        <span className="sr-only">Google Pay</span>
      </span>
    </div>
  );
}
