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
  Factory,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type NavItem = { name: string; href: string; icon: any };
type NavSectionProps = {
  title: string;
  icon: any;
  isOpen: boolean;
  isActive: boolean;
  isCollapsed: boolean;
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
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  return (
    <Link href={item.href}>
      <a
        className={cn(
          "erp-sidebar-link",
          isCollapsed && "collapsed",
          isActive && "active",
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <item.icon className="erp-sidebar-link-icon" />
        <span className="erp-sidebar-menu-text">{item.name}</span>
      </a>
    </Link>
  );
}

function NavSection({
  title,
  icon: Icon,
  isOpen,
  isActive,
  isCollapsed,
  onToggle,
  children,
}: NavSectionProps) {
  return (
    <div className="erp-sidebar-section">
      <button
        onClick={onToggle}
        className={cn(
          "erp-sidebar-section-trigger",
          isCollapsed && "collapsed",
          isActive && "active",
        )}
        title={isCollapsed ? title : undefined}
      >
        <span className="erp-sidebar-section-label">
          <Icon className="erp-sidebar-link-icon" />
          <span className="erp-sidebar-menu-text">{title}</span>
        </span>
        {!isCollapsed && (
          isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        )}
      </button>

      {isOpen && <div className={cn("erp-sidebar-submenu", isCollapsed && "collapsed")}>{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { userProfile } = useStore();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [purchaseOpen, setPurchaseOpen] = useState(true);
  const [vendorOpen, setVendorOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  useEffect(() => {
    const syncSidebarState = () => {
      const sidebar = document.documentElement;
      sidebar.classList.toggle("sidebar-collapsed", isCollapsed && !isMobile);
      sidebar.classList.toggle("sidebar-mobile-open", isMobileOpen && isMobile);
    };

    syncSidebarState();
    return () => {
      document.documentElement.classList.remove("sidebar-collapsed", "sidebar-mobile-open");
    };
  }, [isCollapsed, isMobile, isMobileOpen]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleSidebarToggle = () => {
      if (isMobile) {
        setIsMobileOpen((current) => !current);
        return;
      }

      setIsCollapsed((current) => !current);
      document.documentElement.classList.toggle("collapsed");
    };

    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener("erp:sidebar-toggle", handleSidebarToggle);
    window.addEventListener("erp:sidebar-close", handleClose);

    return () => {
      window.removeEventListener("erp:sidebar-toggle", handleSidebarToggle);
      window.removeEventListener("erp:sidebar-close", handleClose);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location, isMobile]);

  const purchaseActive = purchaseNavigation.some((i) => location === i.href);
  const vendorActive = vendorNavigation.some((i) => location === i.href);
  const inventoryActive = inventoryNavigation.some((i) => location === i.href);
  const financeActive = financeNavigation.some((i) => location === i.href);
  const analyticsActive = analyticsNavigation.some((i) => location === i.href);

  return (
    <>
      <button
        type="button"
        className={cn("erp-sidebar-backdrop", isMobileOpen && "open")}
        onClick={() => setIsMobileOpen(false)}
        aria-label="Close sidebar overlay"
      />

      <aside
        className={cn(
          "erp-sidebar",
          isCollapsed && !isMobile && "collapsed",
          isMobile && "mobile",
          isMobileOpen && "mobile-open",
        )}
      >
        <div className="erp-sidebar-brand">
          <div className="erp-sidebar-logo" aria-hidden="true">
            <Factory className="h-5 w-5" />
          </div>
          <div className="erp-sidebar-brand-copy">
            <span className="erp-sidebar-title">JAKHIRA</span>
            <span className="erp-sidebar-subtitle">ERP Workspace</span>
          </div>
        </div>

        <div className="erp-sidebar-user-chip">
          <span className="erp-sidebar-user-avatar">{userProfile.name.charAt(0)}</span>
          <div className="erp-sidebar-user-copy">
            <span className="erp-sidebar-user-name">{userProfile.name}</span>
            <span className="erp-sidebar-user-role">Operations</span>
          </div>
        </div>

        <nav className="erp-sidebar-nav">
          {dashboardNavigation.map((item) => (
            <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
          ))}
          {siteNavigation.map((item) => (
            <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
          ))}

          <NavSection
            title="Purchase"
            icon={ShoppingCart}
            isOpen={purchaseOpen}
            isActive={purchaseActive}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setPurchaseOpen(!purchaseOpen)}
          >
            {purchaseNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
            ))}
          </NavSection>

          <NavSection
            title="Vendors"
            icon={Users}
            isOpen={vendorOpen}
            isActive={vendorActive}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setVendorOpen(!vendorOpen)}
          >
            {vendorNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
            ))}
          </NavSection>

          <NavSection
            title="Inventory"
            icon={Package}
            isOpen={inventoryOpen}
            isActive={inventoryActive}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setInventoryOpen(!inventoryOpen)}
          >
            {inventoryNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
            ))}
          </NavSection>

          <NavSection
            title="Finance"
            icon={BookOpen}
            isOpen={financeOpen}
            isActive={financeActive}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setFinanceOpen(!financeOpen)}
          >
            {financeNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
            ))}
          </NavSection>

          <NavSection
            title="Analytics"
            icon={BarChart3}
            isOpen={analyticsOpen}
            isActive={analyticsActive}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setAnalyticsOpen(!analyticsOpen)}
          >
            {analyticsNavigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
            ))}
          </NavSection>

          {reportsNavigation.map((item) => (
            <NavLink key={item.name} item={item} isActive={location === item.href} isCollapsed={isCollapsed && !isMobile} />
          ))}
        </nav>
      </aside>
    </>
  );
}
