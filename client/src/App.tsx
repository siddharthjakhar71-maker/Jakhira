import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Sites from "./pages/Sites";
import Vendors from "./pages/Vendors";
import Materials from "./pages/Materials";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderCreate from "./pages/PurchaseOrderCreate";
import GRN from "./pages/GRN";
import GRNCreate from "./pages/GRNCreate";
import Bills from "./pages/Bills";
import BillCreate from "./pages/BillCreate";
import Payments from "./pages/Payments";
import PaymentCreate from "./pages/PaymentCreate";
import StockManagement from "./pages/StockManagement";
import RateHistory from "./pages/RateHistory";
import VendorPayments from "./pages/VendorPayments";
import RateComparison from "./pages/RateComparison";
import VendorRateList from "./pages/VendorRateList";
import VendorLedger from "./pages/VendorLedger";
import VendorStatement from "./pages/VendorStatement";
import VendorPayables from "./pages/VendorPayables";
import CostAnalysis from "./pages/CostAnalysis";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Preferences from "./pages/Preferences";
import AccessControl from "./pages/AccessControl";
import Administration from "./pages/Administration";
import Login from "./pages/Login";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { StoreProvider, useStore } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserStore } from "@/stores/user-store";
import { usePermissions, type PermissionModule } from "@/lib/permissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

function UserStoreInitializer() {
  const { userProfile } = useStore();
  const initializeAvatar = useUserStore((store) => store.initializeAvatar);
  const initializeUser = useUserStore((store) => store.initializeUser);

  useEffect(() => {
    initializeAvatar();
  }, [initializeAvatar]);

  useEffect(() => {
    initializeUser({
      name: userProfile.name,
      avatar: userProfile.avatarUrl,
    });
  }, [initializeUser, userProfile.avatarUrl, userProfile.name]);

  return null;
}

function ProtectedRoute({ moduleName, component: Component }: { moduleName: PermissionModule; component: React.ComponentType }) {
  const { canView } = usePermissions();

  if (!canView(moduleName)) {
    return (
      <AppLayout>
        <div className="flex h-full flex-col items-center justify-center gap-4 pt-20 text-muted-foreground">
          <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-sm">You do not have permission to view the {moduleName} module.</p>
        </div>
      </AppLayout>
    );
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, isAuthLoading } = useStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated && location !== "/login") {
      setLocation("/login");
      return;
    }

    if (isAuthenticated && location === "/login") {
      setLocation("/");
    }
  }, [isAuthenticated, isAuthLoading, location, setLocation]);

  if (isAuthLoading) return null;
  if (!isAuthenticated && location !== "/login") return null;

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute moduleName="Dashboard" component={Dashboard} />} />
      <Route path="/sites" component={() => <ProtectedRoute moduleName="Sites" component={Sites} />} />
      <Route path="/vendors" component={() => <ProtectedRoute moduleName="Vendors" component={Vendors} />} />
      <Route path="/materials" component={() => <ProtectedRoute moduleName="Materials" component={Materials} />} />
      <Route path="/pos" component={() => <ProtectedRoute moduleName="Purchase Orders" component={PurchaseOrders} />} />
      <Route path="/purchase-orders/create" component={() => <ProtectedRoute moduleName="Purchase Orders" component={PurchaseOrderCreate} />} />
      <Route path="/grn" component={() => <ProtectedRoute moduleName="GRN" component={GRN} />} />
      <Route path="/grn/create" component={() => <ProtectedRoute moduleName="GRN" component={GRNCreate} />} />
      <Route path="/bills" component={() => <ProtectedRoute moduleName="Bills" component={Bills} />} />
      <Route path="/bills/create" component={() => <ProtectedRoute moduleName="Bills" component={BillCreate} />} />
      <Route path="/payments" component={() => <ProtectedRoute moduleName="Payments" component={Payments} />} />
      <Route path="/payments/create" component={() => <ProtectedRoute moduleName="Payments" component={PaymentCreate} />} />
      <Route path="/vendor-payments" component={VendorPayments} />
      <Route path="/rate-comparison" component={RateComparison} />
      <Route path="/vendor-rate-list" component={VendorRateList} />
      <Route path="/vendor-ledger" component={VendorLedger} />
      <Route path="/vendor-statement" component={VendorStatement} />
      <Route path="/vendor-statements" component={VendorStatement} />
      <Route path="/vendor-payables" component={VendorPayables} />
      <Route path="/cost-analysis" component={CostAnalysis} />
      <Route path="/stock" component={StockManagement} />
      <Route path="/rate-history" component={RateHistory} />
      <Route path="/reports" component={Reports} />
      <Route path="/profile" component={Profile} />
      <Route path="/access-control" component={() => <ProtectedRoute moduleName="Users" component={AccessControl} />} />
      <Route path="/preferences" component={() => <ProtectedRoute moduleName="Settings" component={Preferences} />} />
      <Route path="/settings" component={Settings} />
      <Route path="/users" component={Users} />
      <Route path="/administration" component={Administration} />
      <Route>
        {() => (
          <AppLayout>
            <div className="flex h-full flex-col items-center justify-center gap-4 pt-20 text-muted-foreground">
              <div className="text-4xl font-light text-muted">404</div>
              <h1 className="text-2xl font-semibold text-foreground">Page Not Found</h1>
            </div>
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.title = "JAKHIRA ERP";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StoreProvider>
          <UserStoreInitializer />
          <Toaster />
          <Router />
        </StoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
