import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { VitalNumber } from "@/components/VitalNumber";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/patient/")({ component: PatientHome, ssr: false });

function PatientHome() {
  const { user } = useAuth();

  const { data: patient } = useQuery({
    queryKey: ["my-patient", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("patients").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: latest } = useQuery({
    queryKey: ["my-vitals-latest", patient?.id],
    enabled: !!patient,
    queryFn: async () => (await supabase.from("vitals").select("*").eq("patient_id", patient!.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const { data: recentAlerts = [] } = useQuery({
    queryKey: ["my-alerts", patient?.id],
    enabled: !!patient,
    queryFn: async () => (await supabase.from("alerts").select("*").eq("patient_id", patient!.id).gte("created_at", new Date(Date.now() - 86400000).toISOString())).data ?? [],
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  if (!patient) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Your patient profile isn't linked yet. Please ask your clinical team to connect your account.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {patient.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {recentAlerts.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-destructive">{recentAlerts.length} alert{recentAlerts.length > 1 ? "s" : ""} in the last 24 hours</div>
            <div className="text-muted-foreground">{recentAlerts[0].type} — {new Date(recentAlerts[0].created_at).toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Next session</div>
        <div className="mt-1 font-serif italic text-2xl">Tomorrow · 9:00 AM</div>
        <div className="text-sm text-muted-foreground mt-1">with your assigned nurse</div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Last recorded vitals</div>
        <div className="grid grid-cols-3 gap-3">
          <Tile label="HR" value={latest?.hr ? Math.round(Number(latest.hr)) : "—"} unit="bpm" />
          <Tile label="SpO₂" value={latest?.spo2 ? Math.round(Number(latest.spo2)) : "—"} unit="%" />
          <Tile label="Temp" value={latest?.temp ? Number(latest.temp).toFixed(1) : "—"} unit="°C" />
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, unit }: { label: string; value: any; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-serif italic text-3xl mt-1">{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </div>
  );
}
