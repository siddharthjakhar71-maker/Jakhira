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
  ChevronDown,
  ChevronRight,
  FileText,
  Truck,
  Wallet,
  Package,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = { name: string; href: string; icon: any };

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

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link href={item.href}>
      <a
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="h-[18px] w-[18px]" />
        {item.name}
      </a>
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { userProfile } = useStore();

  const [purchaseOpen, setPurchaseOpen] = useState(true);
  const [vendorOpen, setVendorOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const purchaseActive = purchaseNavigation.some((i) => location === i.href);
  const vendorActive = vendorNavigation.some((i) => location === i.href);
  const inventoryActive = inventoryNavigation.some((i) => location === i.href);
  const financeActive = financeNavigation.some((i) => location === i.href);
  const analyticsActive = analyticsNavigation.some((i) => location === i.href);

  return (
    <div className="flex flex-col w-64 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">

  <div className="h-16 flex items-center px-6 border-b border-sidebar-border text-lg font-bold tracking-tight">
  <span className="text-[var(--text-primary)]">Billionaire</span>
  <span className="text-[var(--primary-color)] ml-1">Homes</span>
</div>

      <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {dashboardNavigation.map((item) => (
          <NavLink key={item.name} item={item} isActive={location === item.href} />
        ))}
        {siteNavigation.map((item) => (
          <NavLink key={item.name} item={item} isActive={location === item.href} />
        ))}

        {/* PURCHASE */}
        <button
          onClick={() => setPurchaseOpen(!purchaseOpen)}
          className="flex justify-between px-3 py-2.5 text-sm text-sidebar-foreground/75 hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex gap-3 items-center">
            <ShoppingCart className="h-[18px] w-[18px]" /> Purchase
          </span>
          {purchaseOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {purchaseOpen && (
          <div className="ml-6 flex flex-col gap-1">
            {purchaseNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>
        )}

        {/* VENDORS */}
        <button
          onClick={() => setVendorOpen(!vendorOpen)}
          className="flex justify-between px-3 py-2.5 text-sm text-sidebar-foreground/75 hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex gap-3 items-center">
            <Users className="h-[18px] w-[18px]" /> Vendors
          </span>
          {vendorOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {vendorOpen && (
          <div className="ml-6 flex flex-col gap-1">
            {vendorNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>
        )}

        {/* INVENTORY */}
        <button
          onClick={() => setInventoryOpen(!inventoryOpen)}
          className="flex justify-between px-3 py-2.5 text-sm text-sidebar-foreground/75 hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex gap-3 items-center">
            <Package className="h-[18px] w-[18px]" /> Inventory
          </span>
          {inventoryOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {inventoryOpen && (
          <div className="ml-6 flex flex-col gap-1">
            {inventoryNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>
        )}

        {/* FINANCE */}
        <button
          onClick={() => setFinanceOpen(!financeOpen)}
          className="flex justify-between px-3 py-2.5 text-sm text-sidebar-foreground/75 hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex gap-3 items-center">
            <BookOpen className="h-[18px] w-[18px]" /> Finance
          </span>
          {financeOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {financeOpen && (
          <div className="ml-6 flex flex-col gap-1">
            {financeNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>
        )}

        {/* ANALYTICS */}
        <button
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          className="flex justify-between px-3 py-2.5 text-sm text-sidebar-foreground/75 hover:text-sidebar-foreground transition-colors"
        >
          <span className="flex gap-3 items-center">
            <BarChart3 className="h-[18px] w-[18px]" /> Analytics
          </span>
          {analyticsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {analyticsOpen && (
          <div className="ml-6 flex flex-col gap-1">
            {analyticsNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} />
            ))}
          </div>
        )}

        {reportsNavigation.map((item) => (
          <NavLink key={item.name} item={item} isActive={location === item.href} />
        ))}
      </div>
    </div>
  );
}
