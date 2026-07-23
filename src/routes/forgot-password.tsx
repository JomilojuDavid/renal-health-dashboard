import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RenalLogo } from "@/components/RenalLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  ssr: false,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Password reset link sent");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
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
            onClick={() => navigate({ to: "/auth" })}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>

          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 grid place-items-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 text-sm text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the email associated with your account and we'll send you a link to reset your password.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="auth-input"
                    placeholder="you@example.com"
                  />
                </label>

                <button
                  disabled={busy}
                  className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-medium transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`.auth-input{display:block;width:100%;height:2.75rem;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-card);padding:0 .875rem;font-size:.875rem;outline:none;transition:border-color .15s, box-shadow .15s}.auth-input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent)}`}</style>
    </div>
  );
}
