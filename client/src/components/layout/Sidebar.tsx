import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Boxes,
  PieChart,
  BookOpen,
  BarChart3,
  FileText,
  Truck,
  Wallet,
  Package,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { name: string; href: string; icon: any };
type NavSectionProps = {
  title: string;
  icon: any;
  isActive: boolean;
  children: React.ReactNode;
};

const dashboardNavigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
];

const siteNavigation: NavItem[] = [
  { name: "Sites", href: "/sites", icon: MapPinned },
];

const purchaseNavigation: NavItem[] = [
  { name: "Purchase Orders", href: "/pos", icon: ShoppingCart },
  { name: "GRN", href: "/grn", icon: Truck },
  { name: "Bills", href: "/bills", icon: FileText },
  { name: "Payments", href: "/payments", icon: Wallet },
];

const vendorNavigation: NavItem[] = [
  { name: "Vendor List", href: "/vendors", icon: Users },
  { name: "Vendor Rate List", href: "/vendor-rate-list", icon: BookOpen },
  { name: "Rate Comparison", href: "/rate-comparison", icon: BarChart3 },
];

const inventoryNavigation: NavItem[] = [
  { name: "Materials", href: "/materials", icon: Package },
  { name: "Stock Management", href: "/stock", icon: Boxes },
  { name: "Rate History", href: "/rate-history", icon: BookOpen },
];

const financeNavigation: NavItem[] = [
  { name: "Vendor Ledger", href: "/vendor-ledger", icon: BookOpen },
  { name: "Vendor Statement", href: "/vendor-statement", icon: BookOpen },
  { name: "Vendor Payables", href: "/vendor-payables", icon: Wallet },
];

const analyticsNavigation: NavItem[] = [
  { name: "Cost Analysis", href: "/cost-analysis", icon: BarChart3 },
];

const reportsNavigation: NavItem[] = [
  { name: "Reports", href: "/reports", icon: PieChart },
];

function NavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link href={item.href}>
      <a
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium tracking-[0.01em] transition-all duration-200",
          isActive
            ? "border-sky-400/20 bg-gradient-to-r from-sky-500/20 via-slate-800 to-slate-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(2,6,23,0.35)]"
            : "border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.06] hover:text-slate-100",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-200",
            isActive
              ? "border-white/10 bg-white/10 text-white"
              : "border-transparent bg-white/[0.03] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-slate-100",
          )}
        >
          <item.icon className="h-[18px] w-[18px]" />
        </span>
        <span className="truncate">{item.name}</span>
      </a>
    </Link>
  );
}

function NavSection({ title, icon: Icon, isActive, children }: NavSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        <Icon className={cn("h-3.5 w-3.5", isActive && "text-slate-300")} />
        <span>{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { userProfile } = useStore();
  const sidebarRole = userProfile.role.trim() || "Operations";

  const purchaseActive = purchaseNavigation.some((i) => location === i.href);
  const vendorActive = vendorNavigation.some((i) => location === i.href);
  const inventoryActive = inventoryNavigation.some((i) => location === i.href);
  const financeActive = financeNavigation.some((i) => location === i.href);
  const analyticsActive = analyticsNavigation.some((i) => location === i.href);

  return (
    <aside className="erp-sidebar w-[260px] border-r border-white/10 bg-slate-900 text-white">
      <div className="relative flex h-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_35%)]" />

        <div className="relative border-b border-white/10 px-6 py-5">
          <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <img src="/Jakhira.png" alt="Jakhira" className="h-10 w-auto object-contain" />
        </div>

        <div className="relative border-b border-white/10 px-6 py-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/25 to-indigo-500/20 text-sm font-semibold text-slate-50 ring-1 ring-white/10">
                {userProfile.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{userProfile.name}</p>
                <p className="truncate text-xs font-medium tracking-wide text-slate-400">
                  {sidebarRole}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1.5">
            {dashboardNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}

            {siteNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>

          <NavSection title="Purchase" icon={ShoppingCart} isActive={purchaseActive}>
            {purchaseNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </NavSection>

          <NavSection title="Vendors" icon={Users} isActive={vendorActive}>
            {vendorNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </NavSection>

          <NavSection title="Inventory" icon={Package} isActive={inventoryActive}>
            {inventoryNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </NavSection>

          <NavSection title="Finance" icon={BookOpen} isActive={financeActive}>
            {financeNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </NavSection>

          <NavSection title="Analytics" icon={BarChart3} isActive={analyticsActive}>
            {analyticsNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </NavSection>

          <div className="pt-4">
            {reportsNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
