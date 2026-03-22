import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="erp-app-frame min-h-screen">
      <Sidebar />
      <div className="min-h-screen lg:pl-[280px]">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 px-4 pb-8 pt-4 md:px-6 md:pt-5 xl:px-8 xl:pt-6">
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
