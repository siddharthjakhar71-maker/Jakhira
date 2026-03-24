import {
  Bell,
  ChevronDown,
  Menu,
  MoonStar,
  Plus,
  Search,
  ShoppingCart,
  SunMedium,
  Truck,
  Wallet,
  FileText,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { SIDEBAR_TOGGLE_EVENT } from "./Sidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { useUserStore } from "@/stores/user-store";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description:
      "Monitor procurement, billing, stock, and approvals from one workspace.",
  },
  "/pos": {
    title: "Purchase Orders",
    description:
      "Create, track, and export purchase orders without affecting the existing workflows.",
  },
  "/purchase-orders/create": {
    title: "Create Purchase Order",
    description:
      "Capture vendor, site, and line item details in the ERP layout.",
  },
  "/grn": {
    title: "Goods Receipt Notes",
    description: "Review receipts and keep procurement status aligned.",
  },
  "/bills": {
    title: "Bills",
    description: "Manage payable documents and billing progress.",
  },
  "/payments": {
    title: "Payments",
    description: "Track outgoing payments and settlement status.",
  },
};

const quickCreateItems = [
  {
    href: "/purchase-orders/create",
    label: "Purchase Order",
    icon: ShoppingCart,
  },
  { href: "/grn/create", label: "GRN", icon: Truck },
  { href: "/bills/create", label: "Bill", icon: FileText },
  { href: "/payments/create", label: "Payment", icon: Wallet },
];

export function Header() {
  const {
    searchQuery,
    setSearchQuery,
    userProfile,
    bills,
    pos,
    grns,
    siteStocks,
    materials,
    logout,
    can,
  } = useStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [location] = useLocation();

  const unpaidBills = bills.filter((b) => b.status === "Unpaid");
  const pendingPOs = pos.filter((p) => p.status === "Pending");
  const unbilledGRNs = grns.filter((g) => g.status === "Pending Bill");
  const lowStockAlerts = siteStocks
    .map((stock) => ({
      material: materials.find((m) => m.id.toString() === stock.materialId),
      balance: stock.receivedQty - stock.issuedQty,
    }))
    .filter((entry) => entry.balance > 0 && entry.balance <= 10)
    .slice(0, 5);

  const notifications = [
    ...pendingPOs
      .slice(0, 5)
      .map((po) => ({
        label: `PO ${po.displayId} pending receipt`,
        href: `/grn?open=${po.displayId}`,
        count: 1,
        variant: "secondary" as const,
      })),
    ...unbilledGRNs
      .slice(0, 5)
      .map((grn) => ({
        label: `GRN ${grn.displayId} pending bill`,
        href: `/bills?open=${grn.displayId}`,
        count: 1,
        variant: "secondary" as const,
      })),
    ...unpaidBills
      .slice(0, 5)
      .map((bill) => ({
        label: `Bill ${bill.displayId} unpaid`,
        href: `/payments?open=${bill.displayId}`,
        count: 1,
        variant: "destructive" as const,
      })),
    ...lowStockAlerts.map(({ material, balance }) => ({
      label: `Low stock: ${material?.name || "Material"} (${balance})`,
      href: "/stock",
      count: balance,
      variant: "destructive" as const,
    })),
  ];

  const pageMeta = pageTitles[location] ?? {
    title: "Jakhira ERP",
    description:
      "Operate procurement and inventory workflows inside a modern ERP shell.",
  };

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const userName = useUserStore((store) => store.name) || userProfile.name?.trim() || "User";
  const avatarUrl = useUserStore((store) => store.avatar) || userProfile.avatarUrl?.trim() || "";

  return (
    <header className="erp-header-shell">
      <div className="erp-header-panel">
        <div className="flex flex-col gap-3 lg:gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="erp-header-icon-button mt-1 shrink-0 lg:hidden"
              onClick={() =>
                window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))
              }
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="erp-header-kicker">ERP Workspace</span>
                <span className="erp-header-divider" aria-hidden="true" />
                <span className="erp-header-caption">Live operations</span>
              </div>
              <div className="space-y-1">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                  {pageMeta.title}
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {pageMeta.description}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex lg:self-start">
            {can("Purchase Orders", "create") || can("GRN", "create") || can("Bills", "create") || can("Payments", "create") ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="erp-header-button-primary">
                    <Plus className="h-4 w-4" />
                    New
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  {quickCreateItems
                    .filter((item) => {
                      if (item.href.includes("purchase-orders")) return can("Purchase Orders", "create");
                      if (item.href.includes("/grn/")) return can("GRN", "create");
                      if (item.href.includes("/bills/")) return can("Bills", "create");
                      if (item.href.includes("/payments/")) return can("Payments", "create");
                      return false;
                    })
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <DropdownMenuItem className="gap-2">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </DropdownMenuItem>
                        </Link>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:gap-3.5 xl:flex-row xl:items-center xl:justify-between">
          <label className="erp-header-search w-full max-w-3xl">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search purchase orders, vendors, bills, and stock..."
              className="erp-header-search-input"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="erp-header-icon-button"
              onClick={() => setTheme(nextTheme)}
              aria-label={`Switch to ${nextTheme} theme`}
              title={`Switch to ${nextTheme} theme`}
            >
              {resolvedTheme === "dark" ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <MoonStar className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="erp-header-button-secondary relative"
                >
                  <Bell className="h-4 w-4" />
                  Alerts
                  {notifications.length > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {notifications.length}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl">
                <DropdownMenuLabel>Operational alerts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    No outstanding alerts.
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <Link
                      key={`${notification.href}-${index}`}
                      href={notification.href}
                    >
                      <DropdownMenuItem className="flex items-center justify-between gap-3 py-3">
                        <span className="line-clamp-2 flex-1 text-sm">
                          {notification.label}
                        </span>
                        <Badge variant={notification.variant}>
                          {notification.count}
                        </Badge>
                      </DropdownMenuItem>
                    </Link>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="erp-header-profile-trigger"
                >
                  <UserAvatar
                    name={userName}
                    imageUrl={avatarUrl}
                    className="h-8 w-8 rounded-xl"
                    fallbackClassName="rounded-xl text-xs"
                  />
                  <span className="hidden min-w-0 text-left md:block">
                    <span className="block truncate text-sm font-medium leading-none">
                      {userName}
                    </span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={userName}
                      imageUrl={avatarUrl}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{userName}</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings">
                  <DropdownMenuItem className="gap-2">
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
