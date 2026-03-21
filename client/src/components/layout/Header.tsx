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
  <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
    <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-4">

      {/* 🔍 Search */}
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO, vendor, bill..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ⚡ Actions */}
      <div className="flex items-center gap-3">

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <Link href="/pos#new">
              <DropdownMenuItem className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Purchase Order
              </DropdownMenuItem>
            </Link>

            <Link href="/grn#new">
              <DropdownMenuItem className="gap-2">
                <FileCheck className="h-4 w-4" />
                GRN
              </DropdownMenuItem>
            </Link>

            <Link href="/bills#new">
              <DropdownMenuItem className="gap-2">
                <FileText className="h-4 w-4" />
                Bill
              </DropdownMenuItem>
            </Link>

            <Link href="/payments#new">
              <DropdownMenuItem className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 🔔 Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-slate-100">
              <Bell className="h-5 w-5 text-slate-600" />

              {totalNotifications > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                  {totalNotifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 rounded-xl">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {totalNotifications === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">
                No notifications
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <Link key={i} href={n.href}>
                    <DropdownMenuItem className="flex justify-between">
                      <span>{n.label}</span>
                      <Badge variant={n.variant}>{n.count}</Badge>
                    </DropdownMenuItem>
                  </Link>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 👤 User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-xl px-2 hover:bg-slate-100">

              <div className="h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {userProfile.name.charAt(0)}
              </div>

              <span className="hidden md:block text-sm font-medium text-slate-700">
                {userProfile.name}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userProfile.name}</span>
                <span className="text-xs text-slate-500">{userProfile.email}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <Link href="/settings">
              <DropdownMenuItem className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem onClick={logout} className="gap-2 text-red-500">
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
