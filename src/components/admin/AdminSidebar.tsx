import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgePoundSterling,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingBag,
  Smartphone,
  Truck,
  Users,
  UserCog,
  Wrench,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ElementType };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Counter",
    items: [
      { to: "/admin/new-repair", label: "New Repair", icon: Wrench },
      { to: "/admin/buy-phone", label: "Buy Phone", icon: Smartphone },
      { to: "/admin/sell-phone", label: "Sell Phone", icon: BadgePoundSterling },
      { to: "/admin/direct-sale", label: "Direct Sale", icon: ShoppingBag },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/repairs", label: "Repair Invoices", icon: ClipboardList },
      { to: "/admin/stock", label: "Phone Stock", icon: Boxes },
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { to: "/admin/invoices", label: "Invoices", icon: Receipt },
      { to: "/admin/payments", label: "Payments", icon: BadgePoundSterling },
    ],
  },
  {
    title: "Business",
    items: [
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
      { to: "/admin/day-end", label: "Day End & Cash Up", icon: CalendarCheck },
      { to: "/admin/enquiries", label: "Enquiries", icon: Inbox },
    ],
  },
  {
    title: "Website",
    items: [
      { to: "/admin/repair-services", label: "Repair Services", icon: Wrench },
      { to: "/admin/website", label: "Website Content", icon: Globe },
      { to: "/admin/settings", label: "Business Details", icon: Building2 },
      { to: "/admin/invoice-terms", label: "Invoice Terms", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [{ to: "/admin/staff", label: "Staff & Access", icon: UserCog }],
  },
];

function isActiveTo(pathname: string, to: string) {
  return to === "/admin"
    ? pathname === "/admin" || pathname === "/admin/"
    : pathname.startsWith(to);
}

function usePathname() {
  return useRouterState({ select: (s) => s.location.pathname });
}

/** Horizontal topbar navigation (desktop). */
export function AdminTopbarNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {GROUPS.map((group) => {
        const groupActive = group.items.some((i) => isActiveTo(pathname, i.to));

        const item = group.items.length === 1 ? group.items[0] : undefined;
        if (item) {
          const active = isActiveTo(pathname, item.to);
          return (
            <Link
              key={group.title}
              to={item.to}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-admin-nav-muted hover:bg-admin-nav-soft hover:text-admin-nav-fg",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        }

        return (
          <DropdownMenu key={group.title}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  groupActive
                    ? "bg-primary text-primary-foreground"
                    : "text-admin-nav-muted hover:bg-admin-nav-soft hover:text-admin-nav-fg",
                )}
              >
                {group.title}
                <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-52">
              {group.items.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to} className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}

/** Vertical navigation list used inside the mobile drawer. */
export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 px-3 pb-8">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-admin-nav-muted">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActiveTo(pathname, item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-admin-nav-muted hover:bg-admin-nav-soft hover:text-admin-nav-fg",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
