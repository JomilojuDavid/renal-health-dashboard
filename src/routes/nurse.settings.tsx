import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/nurse/settings")({ component: SettingsPage, ssr: false });

function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [t, setT] = useState({ hr_min: 60, hr_max: 100, spo2_min: 94, temp_max: 37.5, notifications_enabled: true });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
      const { data: thresh } = await supabase.from("alert_thresholds").select("*").eq("nurse_id", user.id).maybeSingle();
      if (thresh) setT(thresh as any);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };
  const savePassword = async () => {
    if (!password) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setPassword(""); toast.success("Password updated");
  };
  const saveThresholds = async () => {
    if (!user) return;
    const { error } = await supabase.from("alert_thresholds").upsert({ nurse_id: user.id, ...t });
    if (error) return toast.error(error.message);
    toast.success("Thresholds saved");
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Profile and alert configuration.</p>
      </div>

      <Section title="Profile">
        <Field label="Full name"><input value={name} onChange={e => setName(e.target.value)} className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm" /></Field>
        <Field label="Email"><input value={user?.email ?? ""} disabled className="h-10 w-full px-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground" /></Field>
        <button onClick={saveProfile} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save profile</button>
      </Section>

      <Section title="Change password">
        <Field label="New password"><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm" /></Field>
        <button onClick={savePassword} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Update password</button>
      </Section>

      <Section title="Alert thresholds">
        <div className="grid grid-cols-2 gap-3">
          <Field label="HR min (bpm)"><NumInput v={t.hr_min} onChange={v => setT({ ...t, hr_min: v })} /></Field>
          <Field label="HR max (bpm)"><NumInput v={t.hr_max} onChange={v => setT({ ...t, hr_max: v })} /></Field>
          <Field label="SpO₂ min (%)"><NumInput v={t.spo2_min} onChange={v => setT({ ...t, spo2_min: v })} /></Field>
          <Field label="Temp max (°C)"><NumInput v={t.temp_max} step={0.1} onChange={v => setT({ ...t, temp_max: v })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={t.notifications_enabled} onChange={e => setT({ ...t, notifications_enabled: e.target.checked })} />
          In-app notifications
        </label>
        <button onClick={saveThresholds} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save thresholds</button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-medium">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium mb-1 block text-muted-foreground">{label}</span>{children}</label>;
}
function NumInput({ v, onChange, step = 1 }: { v: number; onChange: (n: number) => void; step?: number }) {
  return <input type="number" step={step} value={v} onChange={e => onChange(parseFloat(e.target.value))} className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm" />;
}
