import { Search, Bell, Plus, FileText, CreditCard, ShoppingCart, FileCheck, Settings, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex-1 max-w-md">
          <div className="flex items-center gap-2 rounded-xl border border-transparent bg-muted px-4 py-2 transition focus-within:border-primary/40 focus-within:bg-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO, vendor, bill..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="hidden items-center gap-2 rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 sm:flex">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card text-foreground">
              <Link href="/pos#new">
                <DropdownMenuItem className="gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Purchase Order
                </DropdownMenuItem>
              </Link>

              <Link href="/grn#new">
                <DropdownMenuItem className="gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  GRN
                </DropdownMenuItem>
              </Link>

              <Link href="/bills#new">
                <DropdownMenuItem className="gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Bill
                </DropdownMenuItem>
              </Link>

              <Link href="/payments#new">
                <DropdownMenuItem className="gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Payment
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-xl text-foreground hover:bg-accent">
                <Bell className="h-5 w-5 text-foreground" />

                {totalNotifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                    {totalNotifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 rounded-xl border-border bg-card text-foreground">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {totalNotifications === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <Link key={i} href={n.href}>
                      <DropdownMenuItem className="flex justify-between gap-3">
                        <span className="text-sm text-foreground">{n.label}</span>
                        <Badge variant={n.variant}>{n.count}</Badge>
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 rounded-xl px-2 hover:bg-accent">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {userProfile.name.charAt(0)}
                </div>

                <span className="hidden text-sm font-medium text-foreground md:block">
                  {userProfile.name}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card text-foreground">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{userProfile.name}</span>
                  <span className="text-xs text-muted-foreground">{userProfile.email}</span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <Link href="/settings">
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
