import { Search, Bell, Plus, FileText, CreditCard, ShoppingCart, FileCheck, Settings, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { searchQuery, setSearchQuery, userProfile, bills, pos, grns, siteStocks, materials, logout } = useStore();

  const unpaidBills = bills.filter((b) => b.status === "Unpaid");
  const pendingPOs = pos.filter((p) => p.status === "Pending");
  const unbilledGRNs = grns.filter((g) => g.status === "Pending Bill");
  const lowStockAlerts = siteStocks
    .map((stock) => ({
      stock,
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

  const totalNotifications = notifications.length;
  const userInitial = userProfile.name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO, vendor, material..."
              className="h-11 w-full rounded-2xl border border-border/70 bg-white pl-11 pr-4 text-sm text-foreground shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground/80 hover:border-border focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="hidden h-11 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-md sm:inline-flex"
                data-testid="button-quick-action"
              >
                <Plus className="mr-2 h-4 w-4" />
                New PO
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-3 w-60 rounded-2xl border border-border/60 p-2 shadow-xl">
              <Link href="/pos#new">
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2.5">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span>Create Purchase Order</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/grn#new">
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2.5">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <span>Receive GRN</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/bills#new">
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Record Bill / Invoice</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/payments#new">
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>Log Payment</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-2xl border border-border/70 bg-white text-muted-foreground shadow-sm transition-all duration-200 hover:border-border hover:bg-accent hover:text-foreground hover:shadow-md"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="sr-only">Open notifications</span>
                {totalNotifications > 0 && (
                  <span className="absolute right-2 top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                    {totalNotifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-3 w-72 rounded-2xl border border-border/60 p-2 shadow-xl">
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {totalNotifications === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">All caught up!</div>
              ) : (
                <div className="max-h-80 space-y-1 overflow-y-auto pt-1">
                  {notifications.map((notification, index) => (
                    <Link key={`${notification.label}-${index}`} href={notification.href}>
                      <DropdownMenuItem className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl py-3">
                        <span className="line-clamp-2 flex-1 text-sm leading-5">{notification.label}</span>
                        <Badge variant={notification.variant} className="shrink-0 rounded-full px-2 py-0.5">
                          {notification.count}
                        </Badge>
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group h-11 rounded-2xl border border-border/70 bg-white px-2.5 shadow-sm transition-all duration-200 hover:border-border hover:bg-accent hover:shadow-md"
                data-testid="button-user-menu"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                    {userInitial}
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="truncate text-sm font-medium text-foreground" data-testid="text-username">
                      {userProfile.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">Account</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-3 w-60 rounded-2xl border border-border/60 p-2 shadow-xl">
              <DropdownMenuLabel className="px-2 py-2 font-normal">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-none">{userProfile.name}</p>
                    <p className="truncate pt-1 text-xs text-muted-foreground">{userProfile.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2.5" data-testid="button-profile-settings">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-xl py-2.5 text-destructive focus:text-destructive" onClick={logout} data-testid="button-logout">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
