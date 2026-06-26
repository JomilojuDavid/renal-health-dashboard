import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/profile")({ component: PatientProfile, ssr: false });

function PatientProfile() {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");

  const { data: patient } = useQuery({
    queryKey: ["my-patient-p", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("patients").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const updatePassword = async () => {
    if (!password) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setPassword(""); toast.success("Password updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary grid place-items-center text-xl font-medium">
          {patient?.name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <div className="text-xl font-semibold">{patient?.name ?? "Patient"}</div>
          <div className="text-sm text-muted-foreground">{patient?.age ? `${patient.age} years old` : user?.email}</div>
        </div>
      </div>

      <Section title="Medical info">
        <Row label="Diagnosis" value={patient?.diagnosis ?? "—"} />
        <Row label="Dialysis frequency" value={patient?.dialysis_frequency ?? "—"} />
        <Row label="Nephrologist" value={patient?.nephrologist ?? "—"} />
      </Section>

      <Section title="Emergency contact">
        <div className="text-sm">{patient?.emergency_contact ?? "—"}</div>
      </Section>

      <Section title="Change password">
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm" />
        <button onClick={updatePassword} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Update password</button>
      </Section>

      <button onClick={signOut} className="h-11 w-full rounded-lg border border-destructive/30 text-destructive text-sm font-medium">Sign out</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
