import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type NavSectionProps = {
  title: string;
  icon: React.ElementType;
  isActive: boolean;
  isOpen: boolean;
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
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <a
        className={cn("erp-sidebar-link", isActive && "active")}
        onClick={onClick}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className="erp-sidebar-link-icon" />
        {!isCollapsed && (
          <span className="erp-sidebar-menu-text">{item.name}</span>
        )}
      </a>
    </Link>
  );
}

function NavSection({
  title,
  icon: Icon,
  isActive,
  isOpen,
  isCollapsed,
  onToggle,
  children,
}: NavSectionProps) {
  return (
    <div className="erp-sidebar-section">
      <button
        type="button"
        className={cn("erp-sidebar-section-trigger", isActive && "active")}
        onClick={onToggle}
        title={isCollapsed ? title : undefined}
      >
        <span className="erp-sidebar-section-label">
          <Icon className="erp-sidebar-link-icon" />
          {!isCollapsed && (
            <span className="erp-sidebar-menu-text">{title}</span>
          )}
        </span>

        {!isCollapsed && (
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {isOpen && !isCollapsed && (
        <div className="erp-sidebar-submenu">{children}</div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { userProfile } = useStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const purchaseActive = purchaseNavigation.some((i) => location === i.href);
  const vendorActive = vendorNavigation.some((i) => location === i.href);
  const inventoryActive = inventoryNavigation.some((i) => location === i.href);
  const financeActive = financeNavigation.some((i) => location === i.href);
  const analyticsActive = analyticsNavigation.some((i) => location === i.href);

  const [purchaseOpen, setPurchaseOpen] = useState(purchaseActive);
  const [vendorOpen, setVendorOpen] = useState(vendorActive);
  const [inventoryOpen, setInventoryOpen] = useState(inventoryActive);
  const [financeOpen, setFinanceOpen] = useState(financeActive);
  const [analyticsOpen, setAnalyticsOpen] = useState(analyticsActive);

  const sidebarRole = userProfile?.role?.trim() || "Operations";
  const userName = userProfile?.name?.trim() || "User";

  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
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

  const closeMobileSidebar = () => {
    if (isMobile) setIsMobileOpen(false);
  };

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
          isMobileOpen && "mobile-open"
        )}
      >
        <div className="erp-sidebar-brand">
          <img
            src="/Jakhira.png"
            alt="Jakhira Logo"
            className="w-full h-auto object-contain max-h-[72px]"
          />
        </div>

        <div className="erp-sidebar-user-chip">
          <span className="erp-sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </span>
          {!isCollapsed && (
            <div className="erp-sidebar-user-copy">
              <span className="erp-sidebar-user-name">{userName}</span>
              <span className="erp-sidebar-user-role">{sidebarRole}</span>
            </div>
          )}
        </div>

        <nav className="erp-sidebar-nav">
          {dashboardNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
              isCollapsed={isCollapsed && !isMobile}
              onClick={closeMobileSidebar}
            />
          ))}

          {siteNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
              isCollapsed={isCollapsed && !isMobile}
              onClick={closeMobileSidebar}
            />
          ))}

          <NavSection
            title="Purchase"
            icon={ShoppingCart}
            isActive={purchaseActive}
            isOpen={purchaseOpen}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setPurchaseOpen((prev) => !prev)}
          >
            {purchaseNavigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={location === item.href}
                isCollapsed={isCollapsed && !isMobile}
                onClick={closeMobileSidebar}
              />
            ))}
          </NavSection>

          <NavSection
            title="Vendors"
            icon={Users}
            isActive={vendorActive}
            isOpen={vendorOpen}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setVendorOpen((prev) => !prev)}
          >
            {vendorNavigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={location === item.href}
                isCollapsed={isCollapsed && !isMobile}
                onClick={closeMobileSidebar}
              />
            ))}
          </NavSection>

          <NavSection
            title="Inventory"
            icon={Package}
            isActive={inventoryActive}
            isOpen={inventoryOpen}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setInventoryOpen((prev) => !prev)}
          >
            {inventoryNavigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={location === item.href}
                isCollapsed={isCollapsed && !isMobile}
                onClick={closeMobileSidebar}
              />
            ))}
          </NavSection>

          <NavSection
            title="Finance"
            icon={BookOpen}
            isActive={financeActive}
            isOpen={financeOpen}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setFinanceOpen((prev) => !prev)}
          >
            {financeNavigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={location === item.href}
                isCollapsed={isCollapsed && !isMobile}
                onClick={closeMobileSidebar}
              />
            ))}
          </NavSection>

          <NavSection
            title="Analytics"
            icon={BarChart3}
            isActive={analyticsActive}
            isOpen={analyticsOpen}
            isCollapsed={isCollapsed && !isMobile}
            onToggle={() => setAnalyticsOpen((prev) => !prev)}
          >
            {analyticsNavigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={location === item.href}
                isCollapsed={isCollapsed && !isMobile}
                onClick={closeMobileSidebar}
              />
            ))}
          </NavSection>

          {reportsNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={location === item.href}
              isCollapsed={isCollapsed && !isMobile}
              onClick={closeMobileSidebar}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}