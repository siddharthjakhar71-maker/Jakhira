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
import Login from "./pages/Login";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { StoreProvider, useStore } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserStore } from "@/stores/user-store";
import { usePermissions } from "@/hooks/usePermissions";

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

function Router() {
  const { isAuthenticated, isAuthLoading } = useStore();
  const [location, setLocation] = useLocation();
  const { canView, permissionMapLoading } = usePermissions();

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

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated && location !== "/login") {
    return null;
  }

  if (permissionMapLoading && location !== "/") {
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/sites">{canView("Sites") ? <Sites /> : <Dashboard />}</Route>
      <Route path="/vendors">{canView("Vendors") ? <Vendors /> : <Dashboard />}</Route>
      <Route path="/materials">{canView("Materials") ? <Materials /> : <Dashboard />}</Route>
      <Route path="/pos">{canView("Purchase Orders") ? <PurchaseOrders /> : <Dashboard />}</Route>
      <Route path="/purchase-orders/create">{canView("Purchase Orders") ? <PurchaseOrderCreate /> : <Dashboard />}</Route>
      <Route path="/grn">{canView("GRN") ? <GRN /> : <Dashboard />}</Route>
      <Route path="/grn/create">{canView("GRN") ? <GRNCreate /> : <Dashboard />}</Route>
      <Route path="/bills">{canView("Bills") ? <Bills /> : <Dashboard />}</Route>
      <Route path="/bills/create">{canView("Bills") ? <BillCreate /> : <Dashboard />}</Route>
      <Route path="/payments">{canView("Payments") ? <Payments /> : <Dashboard />}</Route>
      <Route path="/payments/create">{canView("Payments") ? <PaymentCreate /> : <Dashboard />}</Route>
      <Route path="/vendor-payments">{canView("Payments") ? <VendorPayments /> : <Dashboard />}</Route>
      <Route path="/rate-comparison">{canView("Vendors") ? <RateComparison /> : <Dashboard />}</Route>
      <Route path="/vendor-rate-list">{canView("Vendors") ? <VendorRateList /> : <Dashboard />}</Route>
      <Route path="/vendor-ledger">{canView("Vendors") ? <VendorLedger /> : <Dashboard />}</Route>
      <Route path="/vendor-statement">{canView("Vendors") ? <VendorStatement /> : <Dashboard />}</Route>
      <Route path="/vendor-statements">{canView("Vendors") ? <VendorStatement /> : <Dashboard />}</Route>
      <Route path="/vendor-payables">{canView("Vendors") ? <VendorPayables /> : <Dashboard />}</Route>
      <Route path="/cost-analysis">{canView("Reports") ? <CostAnalysis /> : <Dashboard />}</Route>
      <Route path="/stock">{canView("Stock") ? <StockManagement /> : <Dashboard />}</Route>
      <Route path="/rate-history">{canView("Stock") ? <RateHistory /> : <Dashboard />}</Route>
      <Route path="/reports">{canView("Reports") ? <Reports /> : <Dashboard />}</Route>
      <Route path="/settings">{canView("Settings") ? <Settings /> : <Dashboard />}</Route>
      <Route>
        {() => (
          <AppLayout>
            <div className="h-full flex items-center justify-center flex-col gap-4 text-muted-foreground pt-20">
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
