import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  FileQuestion,
  LogOut,
  Menu,
  Pin,
  PinOff,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdminSidebarNav, AdminTopbarNav } from "@/components/admin/AdminSidebar";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
  notFoundComponent: AdminNotFound,
});

function AdminNotFound() {
  return (
    <div className="admin-card mx-auto max-w-md p-8 text-center">
      <FileQuestion className="mx-auto mb-3 size-8 text-primary" />
      <h1 className="text-lg font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That screen does not exist in the shop system.
      </p>
      <Button asChild className="mt-4">
        <Link to="/admin">Back to dashboard</Link>
      </Button>
    </div>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const { data: session, isLoading } = useAdminSession();
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Auto-hide topbar states (Desktop mouse only)
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin_header_pinned") === "true";
  });
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [isHoveringHeader, setIsHoveringHeader] = useState<boolean>(false);
  const [isFocusWithin, setIsFocusWithin] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback((delay = 650) => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
    }, delay);
  }, [clearHideTimer]);

  const showHeader = useCallback(() => {
    clearHideTimer();
    setIsHeaderVisible(true);
  }, [clearHideTimer]);

  // Toggle header pin state
  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_header_pinned", String(next));
      }
      if (next) {
        showHeader();
      }
      return next;
    });
  }, [showHeader]);

  // Initial page load: show header for 2.5s, then collapse if mouse is elsewhere and unpinned
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isDesktop || isPinned) return;

    initialDismissTimerRef.current = setTimeout(() => {
      if (!isHoveringHeader && !isFocusWithin && !isDropdownOpen && !searchOpen) {
        setIsHeaderVisible(false);
      }
    }, 2500);

    return () => {
      if (initialDismissTimerRef.current) {
        clearTimeout(initialDismissTimerRef.current);
      }
    };
  }, [isPinned, isHoveringHeader, isFocusWithin, isDropdownOpen, searchOpen]);

  // Window top-edge pointer detection (top 30px trigger zone)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isDesktop || isPinned) return;

    function handleMouseMove(e: MouseEvent) {
      if (e.clientY <= 30) {
        showHeader();
      } else if (e.clientY > 120 && !isHoveringHeader && !isFocusWithin && !isDropdownOpen && !searchOpen) {
        // If mouse moves well below header, ensure hide timer is active
        scheduleHide(600);
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isPinned, isHoveringHeader, isFocusWithin, isDropdownOpen, searchOpen, showHeader, scheduleHide]);

  // Keep header visible whenever focus, hover, dropdown, search, or pin is active
  const shouldBeExpanded =
    isPinned ||
    isHeaderVisible ||
    isHoveringHeader ||
    isFocusWithin ||
    isDropdownOpen ||
    searchOpen;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-admin-bg">
        <div className="h-[6.5rem] border-b border-admin-border bg-admin-panel" />
        <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!isLoading && session && (!session.active || session.roles.length === 0)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-admin-bg px-4">
        <div className="admin-card max-w-md p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 size-8 text-primary" />
          <h1 className="text-lg font-extrabold">Access not enabled</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account has no access to the shop system yet. Ask the owner to enable it
            from Users.
          </p>
          <Button className="mt-4" variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell min-h-dvh bg-admin-bg">
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Top Activation Strip & Notch (Desktop Only when collapsed) */}
      {!isPinned && (
        <div
          aria-hidden="true"
          onMouseEnter={showHeader}
          onClick={showHeader}
          className={cn(
            "no-print fixed top-0 inset-x-0 h-4 z-40 cursor-pointer hidden lg:flex items-start justify-center transition-opacity duration-200",
            shouldBeExpanded ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
          )}
        >
          <div className="flex items-center gap-1 rounded-b-md border-x border-b border-admin-border bg-admin-panel/90 px-3 py-0.5 shadow-soft backdrop-blur hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors">
            <ChevronDown className="size-3 animate-bounce" />
            <span className="text-[0.65rem] font-bold uppercase tracking-wider">Menu</span>
          </div>
        </div>
      )}

      {/* Header / Navigation Bar */}
      <header
        onMouseEnter={() => {
          setIsHoveringHeader(true);
          showHeader();
        }}
        onMouseLeave={() => {
          setIsHoveringHeader(false);
          if (!isPinned && !isDropdownOpen && !isFocusWithin && !searchOpen) {
            scheduleHide(650);
          }
        }}
        onFocusCapture={() => {
          setIsFocusWithin(true);
          showHeader();
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocusWithin(false);
            if (!isPinned && !isHoveringHeader && !isDropdownOpen && !searchOpen) {
              scheduleHide(650);
            }
          }
        }}
        className={cn(
          "no-print border-b border-admin-border bg-admin-panel/95 backdrop-blur shadow-soft transition-transform duration-200 ease-out motion-reduce:transition-none z-50",
          // On desktop: fixed overlay positioning when unpinned so content never jumps vertically
          !isPinned
            ? "lg:fixed lg:top-0 lg:inset-x-0"
            : "sticky top-0",
          !isPinned && !shouldBeExpanded ? "lg:-translate-y-full" : "lg:translate-y-0",
        )}
      >
        {/* Top row: Brand + Global Search + User Profile + Pin Toggle + Logout */}
        <div className="flex items-center gap-3 px-4 py-2 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2.5">
            <img src={logoImg} alt="" className="h-8 w-auto" />
            <span className="hidden text-sm font-extrabold leading-tight sm:block">
              Phone Shop
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Shop system
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto flex min-w-0 flex-1 max-w-md items-center gap-2 rounded-md border border-admin-border bg-surface px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <Search className="size-3.5 shrink-0" />
            <span className="truncate">
              Search customer, phone, IMEI, repair or invoice number…
            </span>
            <kbd className="ml-auto hidden rounded border border-admin-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground sm:inline-block">
              /
            </kbd>
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-xs font-bold leading-tight">
              {session?.name ?? session?.email ?? "Staff"}
            </p>
            <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">
              {session?.roles[0] ?? "Staff"}
            </p>
          </div>

          {/* Desktop Pin / Auto-hide Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePin}
            className={cn(
              "hidden lg:inline-flex size-8 text-muted-foreground transition-colors",
              isPinned
                ? "bg-muted font-bold text-primary hover:text-primary"
                : "hover:text-foreground",
            )}
            title={isPinned ? "Unpin topbar (enable auto-hide)" : "Pin topbar (always visible)"}
            aria-label={isPinned ? "Unpin topbar" : "Pin topbar"}
          >
            {isPinned ? <Pin className="size-3.5 rotate-45 text-primary" /> : <PinOff className="size-3.5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="size-8">
            <LogOut className="size-3.5" />
          </Button>

          {/* Mobile Navigation Drawer */}
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 overflow-y-auto bg-admin-nav p-0">
              <div className="px-5 py-5">
                <img src={logoImg} alt="" className="h-8 w-auto" />
              </div>
              <AdminSidebarNav onNavigate={() => setDrawer(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Bottom row: Horizontal Nav (Desktop) */}
        <div className="hidden border-t border-admin-border bg-admin-nav px-3 py-1 lg:block">
          <AdminTopbarNav onDropdownOpenChange={setIsDropdownOpen} />
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={cn(
          "px-4 py-2.5 sm:px-6 lg:px-8 print:p-0 transition-[padding] duration-200",
          isPinned ? "lg:pt-2.5" : "lg:pt-3",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
