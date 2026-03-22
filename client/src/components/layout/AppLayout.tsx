import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="erp-app-frame">
      <Sidebar />
      <div className="min-h-screen lg:pl-[280px]">
        <Header />
        <main className="px-4 pb-8 pt-6 md:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
