import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="erp-app-shell bg-background text-foreground font-sans">
      <Sidebar />
      <div className="erp-app-main flex min-h-screen flex-col w-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
