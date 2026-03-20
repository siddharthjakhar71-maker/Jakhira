import { Search, Bell, Plus, FileText, CreditCard, ShoppingCart, FileCheck, UserCircle, Settings, LogOut, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { searchQuery, setSearchQuery, userProfile, bills, pos, grns, siteStocks, materials, logout } = useStore();

  const unpaidBills = bills.filter(b => b.status === 'Unpaid');
  const pendingPOs = pos.filter(p => p.status === 'Pending');
  const unbilledGRNs = grns.filter(g => g.status === 'Pending Bill');
  const lowStockAlerts = siteStocks
    .map(stock => ({
      stock,
      material: materials.find(m => m.id.toString() === stock.materialId),
      balance: stock.receivedQty - stock.issuedQty,
    }))
    .filter(entry => entry.balance > 0 && entry.balance <= 10)
    .slice(0, 5);

  const notifications = [
    ...pendingPOs.slice(0, 5).map(po => ({ label: `PO ${po.displayId} pending receipt`, href: `/grn?open=${po.displayId}`, count: 1, variant: 'secondary' as const })),
    ...unbilledGRNs.slice(0, 5).map(grn => ({ label: `GRN ${grn.displayId} pending bill`, href: `/bills?open=${grn.displayId}`, count: 1, variant: 'secondary' as const })),
    ...unpaidBills.slice(0, 5).map(bill => ({ label: `Bill ${bill.displayId} unpaid`, href: `/payments?open=${bill.displayId}`, count: 1, variant: 'destructive' as const })),
    ...lowStockAlerts.map(({ material, balance }) => ({ label: `Low stock: ${material?.name || 'Material'} (${balance})`, href: '/stock', count: balance, variant: 'destructive' as const })),
  ];

  const totalNotifications = notifications.length;

  const handleSidebarToggle = () => {
    document.documentElement.classList.toggle('collapsed');
    window.dispatchEvent(new CustomEvent('erp:sidebar-toggle'));
  };

  return (
    <header className="erp-topbar h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm/50 gap-4">
      <div className="flex items-center gap-3 flex-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="erp-sidebar-toggle shrink-0"
          onClick={handleSidebarToggle}
          aria-label="Toggle sidebar"
          data-testid="button-sidebar-toggle"
        >
          <PanelLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center bg-muted/60 rounded-md px-3 py-2 w-full max-w-96 border border-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Global Search (POs, Vendors, Bills)..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
            data-testid="input-search"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 shadow-sm hidden sm:inline-flex" size="sm" data-testid="button-quick-action">
              <Plus className="w-4 h-4" />
              Quick Action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <Link href="/pos#new">
              <DropdownMenuItem className="gap-2 cursor-pointer py-2">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <span>Create Purchase Order</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/grn#new">
              <DropdownMenuItem className="gap-2 cursor-pointer py-2">
                <FileCheck className="w-4 h-4 text-muted-foreground" />
                <span>Receive GRN</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/bills#new">
              <DropdownMenuItem className="gap-2 cursor-pointer py-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Record Bill / Invoice</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/payments#new">
              <DropdownMenuItem className="gap-2 cursor-pointer py-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span>Log Payment</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-background">
                  {totalNotifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 mt-2">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {totalNotifications === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground">All caught up!</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification, index) => (
                  <Link key={`${notification.label}-${index}`} href={notification.href}>
                    <DropdownMenuItem className="flex justify-between cursor-pointer py-2 w-full">
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
              <Button variant="ghost" className="h-8 w-8 rounded-full ml-1 md:ml-2 bg-primary/10 hover:bg-primary/20" data-testid="button-user-menu">
                  <UserCircle className="w-5 h-5 text-primary" />
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none" data-testid="text-username">{userProfile.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer gap-2" data-testid="button-profile-settings">
                  <Settings className="w-4 h-4 text-muted-foreground"/>
                  <span>Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={logout} data-testid="button-logout">
                <LogOut className="w-4 h-4"/>
                <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
