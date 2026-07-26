import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { RenalLogo } from "@/components/RenalLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { email: initialEmail } = Route.useSearch();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    if (!/^\d{6}$/.test(code.trim())) return toast.error("Enter the 6-digit code from your email");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });
      if (vErr) throw vErr;

      const { error: uErr } = await supabase.auth.updateUser({ password });
      if (uErr) throw uErr;

      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email) return toast.error("Enter your email first");
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      toast.success("New code sent");
    } catch (err: any) {
      toast.error(err.message ?? "Could not resend code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-background relative">
      <div className="absolute right-6 top-6"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><RenalLogo /></div>
        <div className="rounded-2xl border border-border bg-card p-8">
          <button
            type="button"
            onClick={() => navigate({ to: "/forgot-password" })}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit code we emailed to your account, then choose a new password.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Verification code</span>
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                className="auth-input tracking-[0.5em] text-center font-mono"
                placeholder="000000"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">New password</span>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="auth-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Confirm password</span>
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="auth-input"
              />
            </label>

            <button
              disabled={busy}
              className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-medium transition hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update password"}
            </button>

            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="w-full text-sm text-primary hover:underline"
            >
              Didn't get the code? Resend
            </button>
          </form>
        </div>
      </div>
      <style>{`.auth-input{display:block;width:100%;height:2.75rem;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-card);padding:0 .875rem;font-size:.875rem;outline:none;transition:border-color .15s, box-shadow .15s}.auth-input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent)}`}</style>
    </div>
  );
}
