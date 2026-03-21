import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldAlert, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const highlights = [
  "Live procurement visibility across projects",
  "Faster PO, GRN, and billing workflows",
  "Secure, role-aware ERP operations",
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useStore();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      localStorage.clear();
      sessionStorage.clear();
      setLocation("/");
    } else {
      setError("Invalid credentials. Please check your email and password and try again.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.26),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.18),transparent_26%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#111827_100%)]" />
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/6 shadow-[0_32px_120px_rgba(2,6,23,0.6)] backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative hidden min-h-[720px] flex-col justify-between overflow-hidden border-b border-white/10 p-8 lg:flex lg:border-b-0 lg:border-r xl:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_38%),linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
            <div className="relative space-y-10">
              <Badge className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-100 backdrop-blur-sm">
                Premium ERP Experience
              </Badge>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-primary/20 backdrop-blur-sm">
                    <img src="/favicon.png" alt="JAKHIRA logo" className="h-10 w-10 object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">JAKHIRA ERP</p>
                    <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white xl:text-5xl">Procurement intelligence with a premium SaaS feel.</h1>
                  </div>
                </div>

                <p className="max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
                  Centralize vendors, purchase orders, GRNs, billing, and project stock in one polished control center built for high-velocity operations.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-6 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Operations</p>
                <p className="mt-3 text-3xl font-semibold text-white">Unified flow</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Track procurement from request to payment without leaving the JAKHIRA workspace.</p>
              </div>
              <div className="rounded-3xl border border-primary/20 bg-primary/12 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-100">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Built for control & clarity</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">Designed to match the app&apos;s premium dashboard styling with stronger hierarchy, depth, and trust.</p>
              </div>
            </div>
          </section>

          <section className="flex min-h-[720px] items-center justify-center p-5 sm:p-8 xl:p-10">
            <Card className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <CardContent className="p-6 sm:p-8 lg:p-10">
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <Badge variant="secondary" className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                      Secure Sign In
                    </Badge>
                    <div>
                      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to access your JAKHIRA ERP workspace and continue managing procurement operations.</p>
                    </div>
                  </div>
                  <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg sm:flex">
                    <Building2 className="h-7 w-7" />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-6 rounded-2xl border-destructive/25 bg-destructive/5 text-destructive [&>svg]:top-5">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Unable to sign in</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@jakhira.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-[52px] rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-4 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-[52px] rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-4 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/10"
                        data-testid="input-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-2 flex h-[52px] w-full items-center justify-center rounded-2xl border-primary bg-slate-950 text-base font-medium text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] hover:bg-slate-900"
                    disabled={loading}
                    data-testid="button-submit"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="mt-8 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 sm:grid-cols-3">
                  <div>
                    <p className="font-semibold text-slate-900">Brand-led</p>
                    <p className="mt-1 leading-6">Refined visuals consistent with the premium dashboard.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Responsive</p>
                    <p className="mt-1 leading-6">Split layout on desktop, focused sign-in on smaller screens.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Unchanged auth</p>
                    <p className="mt-1 leading-6">Same store login call, loading state, and redirect flow.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
