import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { PatientDrawer } from "@/components/PatientDrawer";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { usePatientSession, type PatientSession } from "@/hooks/usePatientSession";
import { useVitalSignsSubscription } from "@/hooks/useVitalSignsSubscription";

export const Route = createFileRoute("/nurse/")({
  component: Dashboard,
  ssr: false,
});

type Patient = { id: string; name: string; status: string; age: number | null; diagnosis: string | null; dialysis_frequency: string | null };
function Dashboard() {
  const [selected, setSelected] = useState<string | null>(null);
  const { session } = usePatientSession();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["nurse-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id,name,status,age,diagnosis,dialysis_frequency").order("name");
      if (error) throw error;
      return data as Patient[];
    },
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery({
    queryKey: ["nurse-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [patientsRes, sessionsRes, alertsRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("started_at,ended_at").gte("started_at", today.toISOString()),
        supabase.from("alerts").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      ]);
      const sessions = sessionsRes.data ?? [];
      const activeNow = sessions.filter((s: any) => !s.ended_at).length;
      const durations = sessions.filter((s: any) => s.ended_at).map((s: any) => (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      return {
        totalPatients: patientsRes.count ?? 0,
        activeToday: activeNow,
        alertsToday: alertsRes.count ?? 0,
        avgDuration: avg,
      };
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live patient vitals and session activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={stats?.totalPatients ?? "—"} />
        <StatCard label="Active Sessions Today" value={stats?.activeToday ?? "—"} />
        <StatCard label="Alerts Today" value={stats?.alertsToday ?? "—"} accent={!!stats?.alertsToday} />
        <StatCard label="Avg Session" value={stats?.avgDuration != null ? `${stats.avgDuration}m` : "—"} />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No patients yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map((p) => (
            <PatientVitalCard
              key={p.id}
              patient={p}
              session={session?.patientId === p.id ? session : null}
              onSelect={() => setSelected(p.id)}
            />
          ))}
        </div>
      )}

      <PatientDrawer patientId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PatientVitalCard({
  patient,
  session,
  onSelect,
}: {
  patient: Patient;
  session: PatientSession | null;
  onSelect: () => void;
}) {
  const { vitals, latestVital } = useVitalSignsSubscription(session);
  const critical = patient.status === "Critical";
  const chartData = vitals.map((vital) => ({ hr: vital.heart_rate }));

  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border bg-card p-5 transition hover:shadow-md ${critical ? "border-l-4 border-l-destructive border-destructive/30 bg-destructive/[0.04]" : "border-border"}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{patient.name}</div>
          <div className="text-xs text-muted-foreground">{patient.diagnosis ?? "—"}</div>
        </div>
        <StatusBadge status={patient.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="HR" value={latestVital?.heart_rate ?? "—"} unit="bpm" pulse />
        <Metric label="SpO₂" value={latestVital?.spo2 != null ? Math.round(Number(latestVital.spo2)) : "—"} unit="%" />
        <Metric label="Temp" value={latestVital?.body_temperature != null ? Number(latestVital.body_temperature).toFixed(1) : "—"} unit="°C" />
      </div>
      {chartData.length > 1 && (
        <div className="mt-4 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="hr" stroke="var(--color-primary)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`mt-2 font-serif italic text-4xl ${accent ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value, unit, pulse }: { label: string; value: any; unit: string; pulse?: boolean }) {
  return (
    <div className="relative">
      {pulse && value !== "—" && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-destructive/70">
          <span className="absolute inset-0 rounded-full animate-pulse-ring bg-destructive/60" />
        </span>
      )}
      <div className="font-serif italic text-2xl leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label} {unit}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-primary/10 text-primary",
    Critical: "bg-destructive/10 text-destructive",
    Resting: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
