import React, { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { useUserStore } from "@/stores/user-store";

const SIDEBAR_TOGGLE_EVENT = "erp:toggle-sidebar";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
};

type NavSectionProps = {
  title: string;
  icon: React.ElementType;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
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
  { name: "Vendor Statement", href: "/vendor-statement", icon: FileText },
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
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <a
        onClick={onClick}
        className={cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
          isActive
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
            : "text-slate-200/85 hover:bg-white/10 hover:text-white",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
            isActive
              ? "border-slate-200 bg-slate-50 text-primary dark:border-slate-700 dark:bg-slate-900/70"
              : "border-white/10 bg-white/5 text-slate-300 group-hover:border-white/15 group-hover:text-white",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate">{item.name}</span>
        {item.badge ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
            {item.badge}
          </span>
        ) : null}
      </a>
    </Link>
  );
}

function NavSection({
  title,
  icon: Icon,
  isActive,
  isOpen,
  onToggle,
  children,
}: NavSectionProps) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
          isActive
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white",
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {isOpen ? <div className="space-y-1 pl-3">{children}</div> : null}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { userProfile } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const purchaseActive = purchaseNavigation.some(
    (i) => location === i.href || location.startsWith("/purchase-orders"),
  );
  const vendorActive = vendorNavigation.some((i) => location === i.href);
  const inventoryActive = inventoryNavigation.some((i) => location === i.href);
  const financeActive = financeNavigation.some((i) => location === i.href);
  const analyticsActive = analyticsNavigation.some((i) => location === i.href);

  const [purchaseOpen, setPurchaseOpen] = useState(true);
  const [vendorOpen, setVendorOpen] = useState(vendorActive);
  const [inventoryOpen, setInventoryOpen] = useState(inventoryActive);
  const [financeOpen, setFinanceOpen] = useState(financeActive);
  const [analyticsOpen, setAnalyticsOpen] = useState(analyticsActive);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) setIsMobileOpen(false);
    };

    const handleToggle = () => setIsMobileOpen((prev) => !prev);

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
    };
  }, []);

  useEffect(() => {
    if (purchaseActive) setPurchaseOpen(true);
    if (vendorActive) setVendorOpen(true);
    if (inventoryActive) setInventoryOpen(true);
    if (financeActive) setFinanceOpen(true);
    if (analyticsActive) setAnalyticsOpen(true);
  }, [
    purchaseActive,
    vendorActive,
    inventoryActive,
    financeActive,
    analyticsActive,
  ]);

  const userName = useUserStore((store) => store.name) || userProfile?.name?.trim() || "User";
  const avatarUrl = useUserStore((store) => store.avatar) || userProfile?.avatarUrl?.trim() || "";

  const sections = useMemo(
    () => [
      {
        key: "purchase",
        title: "Purchase",
        icon: ShoppingCart,
        active: purchaseActive,
        open: purchaseOpen,
        setOpen: setPurchaseOpen,
        items: purchaseNavigation,
      },
      {
        key: "vendors",
        title: "Vendors",
        icon: Users,
        active: vendorActive,
        open: vendorOpen,
        setOpen: setVendorOpen,
        items: vendorNavigation,
      },
      {
        key: "inventory",
        title: "Inventory",
        icon: Package,
        active: inventoryActive,
        open: inventoryOpen,
        setOpen: setInventoryOpen,
        items: inventoryNavigation,
      },
      {
        key: "finance",
        title: "Finance",
        icon: Wallet,
        active: financeActive,
        open: financeOpen,
        setOpen: setFinanceOpen,
        items: financeNavigation,
      },
      {
        key: "analytics",
        title: "Analytics",
        icon: BarChart3,
        active: analyticsActive,
        open: analyticsOpen,
        setOpen: setAnalyticsOpen,
        items: analyticsNavigation,
      },
    ],
    [
      purchaseActive,
      purchaseOpen,
      vendorActive,
      vendorOpen,
      inventoryActive,
      inventoryOpen,
      financeActive,
      financeOpen,
      analyticsActive,
      analyticsOpen,
    ],
  );

  const closeMobile = () => {
    if (isMobile) setIsMobileOpen(false);
  };

  return (
    <>
      <div
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300",
          isMobile
            ? isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <img
                src="/sidebarlogo.png"
                alt="Jakhira ERP"
                className="h-8 w-8 rounded-xl object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Jakhira ERP
              </p>
              <p className="text-sm text-slate-200">
                Purchase & inventory suite
              </p>
            </div>
          </div>

          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          ) : null}
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={userName}
                imageUrl={avatarUrl}
                className="h-11 w-11 rounded-2xl"
                fallbackClassName="rounded-2xl bg-primary/20 text-base text-primary-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-white">
                  {userName}
                </p>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-10.75rem)] px-4 pb-6 pt-4">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Overview
              </p>
              {[...dashboardNavigation, ...siteNavigation].map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={location === item.href}
                  onClick={closeMobile}
                />
              ))}
            </div>

            {sections.map((section) => (
              <div key={section.key} className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {section.title}
                </p>
                <NavSection
                  title={section.title}
                  icon={section.icon}
                  isActive={section.active}
                  isOpen={section.open}
                  onToggle={() => section.setOpen((prev: boolean) => !prev)}
                >
                  {section.items.map((item) => (
                    <NavLink
                      key={item.name}
                      item={item}
                      isActive={location === item.href}
                      onClick={closeMobile}
                    />
                  ))}
                </NavSection>
              </div>
            ))}

            <div className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Administration
              </p>
              {reportsNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={location === item.href}
                  onClick={closeMobile}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </aside>

      {isMobile ? (
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-4 left-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : null}
    </>
  );
}

export { SIDEBAR_TOGGLE_EVENT };
