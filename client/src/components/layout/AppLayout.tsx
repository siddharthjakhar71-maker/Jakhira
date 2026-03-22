import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "wouter";

const HEADER_HIDDEN_ROUTE_PATTERNS = [
  "/purchase-orders/create",
  "/grn/create",
  "/bills/create",
  "/payments/create",
] as const;

const shouldHideHeader = (pathname: string) =>
  HEADER_HIDDEN_ROUTE_PATTERNS.some((routePattern) => pathname === routePattern);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const hideHeader = shouldHideHeader(location);

  return (
    <div className="erp-app-frame min-h-screen">
      <Sidebar />
      <div className="min-h-screen lg:pl-[280px]">
        <div className="flex min-h-screen flex-col">
          {!hideHeader ? <Header /> : null}
          <main className={hideHeader ? "flex-1 px-4 pb-8 pt-4 md:px-6 xl:px-8" : "flex-1 px-4 pb-8 pt-4 md:px-6 md:pt-5 xl:px-8 xl:pt-6"}>
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
