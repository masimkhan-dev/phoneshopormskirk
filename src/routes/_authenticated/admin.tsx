import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileQuestion, LogOut, Menu, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { AdminSidebarNav, AdminTopbarNav } from "@/components/admin/AdminSidebar";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";
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

      <header className="no-print sticky top-0 z-30 border-b border-admin-border bg-admin-panel/95 backdrop-blur">
        {/* top row: brand + search + user */}
        <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
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
            className="ml-auto flex min-w-0 flex-1 max-w-md items-center gap-2 rounded-md border border-admin-border bg-surface px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">
              Search customer, phone, IMEI, repair or invoice number
            </span>
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-xs font-bold leading-tight">
              {session?.name ?? session?.email ?? "Staff"}
            </p>
            <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">
              {session?.roles[0] ?? "Staff"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>

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

        {/* bottom row: horizontal nav (desktop) */}
        <div className="hidden border-t border-admin-border bg-admin-nav px-3 py-1.5 lg:block">
          <AdminTopbarNav />
        </div>
      </header>

      <main className="px-4 py-3 sm:px-6 lg:px-8 print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
