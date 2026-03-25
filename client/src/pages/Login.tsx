import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

type ValidationErrors = {
  email?: string;
  password?: string;
};

const REMEMBER_ME_KEY = "jakhira_remember_me";
const REMEMBERED_EMAIL_KEY = "jakhira_remembered_email";

export default function Login() {
  const { login } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const storedPreference = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    const storedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";

    setRememberMe(storedPreference);
    if (storedPreference && storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const footerYear = useMemo(() => new Date().getFullYear(), []);

  const validateForm = () => {
    const nextErrors: ValidationErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid business email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const persistRememberPreference = (nextRememberMe: boolean, nextEmail: string) => {
    localStorage.setItem(REMEMBER_ME_KEY, String(nextRememberMe));

    if (nextRememberMe) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, nextEmail.trim());
      return;
    }

    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim();
    const success = await login(normalizedEmail, password);
    setLoading(false);

    if (!success) {
      toast({
        title: "Sign in failed",
        description: "Check your email and password, then try again.",
        variant: "destructive",
      });
      return;
    }

    persistRememberPreference(rememberMe, normalizedEmail);
    setLocation("/");
  };

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    persistRememberPreference(checked, email);
  };

  const handleForgotPassword = () => {
    setForgotPasswordOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-[0_32px_90px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-2">
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 lg:p-12">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-900 shadow-sm">
                  J
                </div>
                <div>
                  <div className="text-lg font-semibold">Jakhira ERP</div>
                  <div className="text-sm text-white/60">Business operations platform</div>
                </div>
              </div>

              <div className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                Unified ERP workspace
              </div>
              <h2 className="mb-4 max-w-lg text-3xl font-bold leading-tight lg:text-4xl">
                Control procurement, inventory, and payments from one dashboard.
              </h2>
              <p className="max-w-xl text-white/70">
                A modern workspace for creating POs, tracking GRNs, managing vendor payments, and monitoring reports with clarity.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="mb-2 text-sm text-white/60">Purchase Orders</div>
                  <div className="text-3xl font-bold">128</div>
                  <div className="mt-2 text-xs text-emerald-300">+18% this month</div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="mb-2 text-sm text-white/60">Pending GRNs</div>
                  <div className="text-3xl font-bold">24</div>
                  <div className="mt-2 text-xs text-amber-300">Needs follow-up</div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-white/60">Activity snapshot</div>
                    <div className="mt-1 text-xl font-semibold">Today’s operations</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-1 text-xs text-white/80">Live</div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-white/70">Bills created</span>
                    <span className="font-semibold">16</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-white/70">Payments logged</span>
                    <span className="font-semibold">9</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-white/70">Inventory updates</span>
                    <span className="font-semibold">42</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-white p-8 text-slate-900 lg:p-12">
            <div>
              <div className="mx-auto max-w-md">
                <div className="mb-5 inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  Secure business access
                </div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl">Welcome back</h1>
                <p className="mb-8 text-slate-500">Sign in to continue to your ERP dashboard.</p>

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <div>
                    <Label className="mb-2 block text-sm font-medium" htmlFor="email">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (errors.email) {
                            setErrors((current) => ({ ...current, email: undefined }));
                          }
                        }}
                        placeholder="you@company.com"
                        className="h-[52px] rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-4 text-slate-900 shadow-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      />
                    </div>
                    {errors.email ? <p className="mt-2 text-sm text-rose-600">{errors.email}</p> : null}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <Label className="block text-sm font-medium" htmlFor="password">
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
                        onClick={handleForgotPassword}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (errors.password) {
                            setErrors((current) => ({ ...current, password: undefined }));
                          }
                        }}
                        placeholder="Enter your password"
                        className="h-[52px] rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-20 text-slate-900 shadow-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {errors.password ? <p className="mt-2 text-sm text-rose-600">{errors.password}</p> : null}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600" htmlFor="remember-me">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => handleRememberMeChange(checked === true)}
                        className="h-4 w-4 rounded border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                      />
                      Remember me
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-14 w-full rounded-2xl border-slate-900 bg-slate-900 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </div>
            </div>

            <div className="pt-10 text-center text-xs text-slate-400">© {footerYear} Jakhira ERP</div>
          </div>
        </div>
      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-md">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">Reset password</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Contact your Jakhira ERP administrator or the IT support desk to reset your account password.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              For secure account recovery, password resets are handled outside the login screen. Once your password has been updated, return here and sign in with your new credentials.
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="h-11 rounded-2xl border-slate-900 bg-slate-900 px-5 text-white hover:bg-slate-800"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
