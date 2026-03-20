import { Search, Bell, Plus, FileText, CreditCard, ShoppingCart, FileCheck, UserCircle, Settings, LogOut } from "lucide-react";
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

  return (
    <header className="erp-topbar border-b bg-background sticky top-0 z-30 shadow-sm/50">
      <div className="erp-topbar-inner">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex w-full max-w-96 items-center rounded-md border border-transparent bg-muted/60 px-3 py-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Global Search (POs, Vendors, Bills)..."
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="hidden gap-2 shadow-sm sm:inline-flex" size="sm" data-testid="button-quick-action">
                <Plus className="h-4 w-4" />
                Quick Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2 w-56">
              <Link href="/pos#new">
                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span>Create Purchase Order</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/grn#new">
                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <span>Receive GRN</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/bills#new">
                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Record Bill / Invoice</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/payments#new">
                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>Log Payment</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {totalNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-destructive text-[10px] font-bold text-white">
                    {totalNotifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2 w-64">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {totalNotifications === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">All caught up!</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <Link key={`${notification.label}-${index}`} href={notification.href}>
                      <DropdownMenuItem className="flex w-full cursor-pointer justify-between py-2">
                        <span className="text-sm">{notification.label}</span>
                        <Badge variant={notification.variant}>{notification.count}</Badge>
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-1 h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 md:ml-2" data-testid="button-user-menu">
                <UserCircle className="h-5 w-5 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2 w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none" data-testid="text-username">{userProfile.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer gap-2" data-testid="button-profile-settings">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={logout} data-testid="button-logout">
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
