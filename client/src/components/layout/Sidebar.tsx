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
      <a className={cn("erp-sidebar-link", isActive && "active")}>
        <item.icon className="erp-sidebar-link-icon" />
        <span className="erp-sidebar-menu-text">{item.name}</span>
      </a>
    </Link>
  );
}

function NavSection({
  title,
  icon: Icon,
  isActive,
  children,
}: NavSectionProps) {
  return (
    <div className="erp-sidebar-section">
      <div className={cn("erp-sidebar-section-trigger", isActive && "active")}>
        <span className="erp-sidebar-section-label">
          <Icon className="erp-sidebar-link-icon" />
          <span className="erp-sidebar-menu-text">{title}</span>
        </span>
      </div>

      <div className="erp-sidebar-submenu">{children}</div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { userProfile } = useStore();
  const sidebarRole = userProfile?.role?.trim() || "Operations";

  const purchaseActive = purchaseNavigation.some((i) => location === i.href);
  const vendorActive = vendorNavigation.some((i) => location === i.href);
  const inventoryActive = inventoryNavigation.some((i) => location === i.href);
  const financeActive = financeNavigation.some((i) => location === i.href);
  const analyticsActive = analyticsNavigation.some((i) => location === i.href);

  return (
    <aside className="erp-sidebar">
      <div className="erp-sidebar-brand">
        <img
          src="/Jakhira.png"
          alt="Jakhira Logo"
          className="erp-sidebar-logo"
        />
      </div>

      <div className="erp-sidebar-user-chip">
        <span className="erp-sidebar-user-avatar">
          {userProfile.name.charAt(0)}
        </span>
        <div className="erp-sidebar-user-copy">
          <span className="erp-sidebar-user-name">{userProfile.name}</span>
          <span className="erp-sidebar-user-role">{sidebarRole}</span>
        </div>
      </div>

      <nav className="erp-sidebar-nav">
        {dashboardNavigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={location === item.href}
          />
        ))}

        {siteNavigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={location === item.href}
          />
        ))}

        <NavSection
          title="Purchase"
          icon={ShoppingCart}
          isActive={purchaseActive}
        >
          {purchaseNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
            />
          ))}
        </NavSection>

        <NavSection title="Vendors" icon={Users} isActive={vendorActive}>
          {vendorNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
            />
          ))}
        </NavSection>

        <NavSection
          title="Inventory"
          icon={Package}
          isActive={inventoryActive}
        >
          {inventoryNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
            />
          ))}
        </NavSection>

        <NavSection title="Finance" icon={BookOpen} isActive={financeActive}>
          {financeNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
            />
          ))}
        </NavSection>

        <NavSection
          title="Analytics"
          icon={BarChart3}
          isActive={analyticsActive}
        >
          {analyticsNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
            />
          ))}
        </NavSection>

        {reportsNavigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={location === item.href}
          />
        ))}
      </nav>
    </aside>
  );
}