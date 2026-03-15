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
import { BRAND } from "@/config/brand";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

function Router() {
  const { isAuthenticated } = useStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated && location !== '/login') {
      setLocation('/login');
    }
  }, [isAuthenticated, location, setLocation]);

  if (!isAuthenticated && location !== '/login') {
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/sites" component={Sites} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/materials" component={Materials} />
      <Route path="/pos" component={PurchaseOrders} />
      <Route path="/purchase-orders/create" component={PurchaseOrderCreate} />
      <Route path="/grn" component={GRN} />
      <Route path="/grn/create" component={GRNCreate} />
      <Route path="/bills" component={Bills} />
      <Route path="/bills/create" component={BillCreate} />
      <Route path="/payments" component={Payments} />
      <Route path="/payments/create" component={PaymentCreate} />
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
      <Route path="/settings" component={Settings} />
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
    document.title = BRAND.appName;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StoreProvider>
          <Toaster />
          <Router />
        </StoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
