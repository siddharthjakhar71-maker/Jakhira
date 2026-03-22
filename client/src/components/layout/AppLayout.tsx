import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,transparent_30%),linear-gradient(180deg,hsl(var(--background))_0%,color-mix(in_srgb,var(--bg)_92%,#e2e8f0_8%)_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,#1e293b_0%,transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
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
