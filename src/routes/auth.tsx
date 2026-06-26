import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RenalLogo } from "@/components/RenalLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  ssr: false,
});

type Role = "nurse" | "patient";

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<Role>("nurse");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (role === "nurse") navigate({ to: "/nurse" });
    else if (role === "patient") navigate({ to: "/patient" });
  }, [user, role, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role: selectedRole },
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-primary/95 to-primary/70 text-primary-foreground overflow-hidden">
        <RenalLogo className="text-primary-foreground [&>div]:bg-primary-foreground/15 [&_svg]:text-primary-foreground" />
        <div className="relative z-10">
          <h2 className="font-serif italic text-5xl leading-tight">Calm clinical clarity for every dialysis session.</h2>
          <p className="mt-6 max-w-md text-primary-foreground/80">Real-time vitals, alert intelligence, and patient context — built for nephrology teams and the people in their care.</p>
        </div>
        <div className="flex items-end gap-6 text-primary-foreground/70 text-sm">
          <div><div className="font-serif italic text-3xl text-primary-foreground">98.7%</div>uptime</div>
          <div><div className="font-serif italic text-3xl text-primary-foreground">12k+</div>sessions monitored</div>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-6 py-10">
        <div className="absolute right-6 top-6"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><RenalLogo /></div>
          <h1 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Sign in to RenalWatch" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continue to your clinical workspace.</p>

          <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1">
            {(["nurse", "patient"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`px-4 h-8 rounded-full text-sm font-medium transition ${selectedRole === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                I am a {r === "nurse" ? "Nurse" : "Patient"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="auth-input" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="auth-input" />
            </Field>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-border" />
                Remember me
              </label>
              <button type="button" onClick={() => toast.info("Password reset link will be sent — UI demo")} className="text-primary hover:underline">
                Forgot password?
              </button>
            </div>

            <button disabled={busy} className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-medium transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            {mode === "signin" ? "New to RenalWatch?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
      <style>{`.auth-input{display:block;width:100%;height:2.75rem;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-card);padding:0 .875rem;font-size:.875rem;outline:none;transition:border-color .15s, box-shadow .15s}.auth-input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
