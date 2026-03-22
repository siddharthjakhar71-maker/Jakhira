import { Bell, Menu, MoonStar, Plus, Search, Settings, ShoppingCart, SunMedium, Truck, Wallet, FileText, LogOut } from "lucide-react";
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

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Monitor procurement, billing, stock, and approvals from one workspace." },
  "/pos": { title: "Purchase Orders", description: "Create, track, and export purchase orders without affecting the existing workflows." },
  "/purchase-orders/create": { title: "Create Purchase Order", description: "Capture vendor, site, and line item details in the ERP layout." },
  "/grn": { title: "Goods Receipt Notes", description: "Review receipts and keep procurement status aligned." },
  "/bills": { title: "Bills", description: "Manage payable documents and billing progress." },
  "/payments": { title: "Payments", description: "Track outgoing payments and settlement status." },
};

export function Header() {
  const { searchQuery, setSearchQuery, userProfile, bills, pos, grns, siteStocks, materials, logout } = useStore();
  const { theme, setTheme } = useTheme();
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
    ...pendingPOs.slice(0, 5).map((po) => ({ label: `PO ${po.displayId} pending receipt`, href: `/grn?open=${po.displayId}`, count: 1, variant: "secondary" as const })),
    ...unbilledGRNs.slice(0, 5).map((grn) => ({ label: `GRN ${grn.displayId} pending bill`, href: `/bills?open=${grn.displayId}`, count: 1, variant: "secondary" as const })),
    ...unpaidBills.slice(0, 5).map((bill) => ({ label: `Bill ${bill.displayId} unpaid`, href: `/payments?open=${bill.displayId}`, count: 1, variant: "destructive" as const })),
    ...lowStockAlerts.map(({ material, balance }) => ({ label: `Low stock: ${material?.name || "Material"} (${balance})`, href: "/stock", count: balance, variant: "destructive" as const })),
  ];

  const pageMeta = pageTitles[location] ?? { title: "Jakhira ERP", description: "Operate procurement and inventory workflows inside a modern ERP shell." };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 xl:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="mt-1 shrink-0 lg:hidden"
              onClick={() => window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">ERP Workspace</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{pageMeta.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{pageMeta.description}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/settings">
              <a>
                <Button type="button" variant="outline">Settings</Button>
              </a>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-xl">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <Link href="/purchase-orders/create"><DropdownMenuItem className="gap-2"><ShoppingCart className="h-4 w-4" />Purchase Order</DropdownMenuItem></Link>
                <Link href="/grn/create"><DropdownMenuItem className="gap-2"><Truck className="h-4 w-4" />GRN</DropdownMenuItem></Link>
                <Link href="/bills/create"><DropdownMenuItem className="gap-2"><FileText className="h-4 w-4" />Bill</DropdownMenuItem></Link>
                <Link href="/payments/create"><DropdownMenuItem className="gap-2"><Wallet className="h-4 w-4" />Payment</DropdownMenuItem></Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search purchase orders, vendors, bills, and stock..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="relative rounded-xl">
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
                  <div className="p-4 text-sm text-muted-foreground">No outstanding alerts.</div>
                ) : (
                  notifications.map((notification, index) => (
                    <Link key={`${notification.href}-${index}`} href={notification.href}>
                      <DropdownMenuItem className="flex items-center justify-between gap-3 py-3">
                        <span className="line-clamp-2 flex-1 text-sm">{notification.label}</span>
                        <Badge variant={notification.variant}>{notification.count}</Badge>
                      </DropdownMenuItem>
                    </Link>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 gap-3 rounded-2xl px-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className="block text-sm font-medium leading-none">{userProfile.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{userProfile.role}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <div className="font-medium">{userProfile.name}</div>
                    <div className="text-xs text-muted-foreground">{userProfile.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings"><DropdownMenuItem className="gap-2"><Settings className="h-4 w-4" />Settings</DropdownMenuItem></Link>
                <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive"><LogOut className="h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
