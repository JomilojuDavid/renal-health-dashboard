import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Wifi, WifiOff, Square, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatientSession } from "@/hooks/usePatientSession";
import { useVitalSignsSubscription } from "@/hooks/useVitalSignsSubscription";

export const Route = createFileRoute("/nurse/monitor")({
  component: MonitorPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live Monitor — RenalWatch" },
      { name: "description", content: "Start a patient session and follow live vital signs in real time." },
      { property: "og:title", content: "Live Monitor — RenalWatch" },
      { property: "og:description", content: "Start a patient session and follow live vital signs in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Patient = { id: string; name: string; age: number | null; diagnosis: string | null };

function MonitorPage() {
  const { session, startSession, endSession } = usePatientSession();
  const { vitals, latestVital, isConnected, error } = useVitalSignsSubscription(session);

  const { data: patients = [] } = useQuery({
    queryKey: ["monitor-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id,name,age,diagnosis").order("name");
      if (error) throw error;
      return data as Patient[];
    },
  });

  const select = async (p: Patient) => {
    try {
      await startSession(p.id, p.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start session");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live Monitor</h1>
        <p className="text-sm text-muted-foreground">Select a patient to start a session and record vital signs.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          {patients.map((p) => {
            const active = session?.patientId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => select(p)}
                className={`w-full text-left rounded-xl border bg-card p-4 transition hover:shadow-md ${active ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted"><User className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.age ?? "—"} yrs · {p.diagnosis ?? "—"}</div>
                  </div>
                  {active && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Recording</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          {!session ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="font-medium text-foreground">No active session</p>
              <p className="mt-1 text-sm">Select a patient to begin monitoring.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Active session</div>
                  <div className="text-xl font-semibold">{session.patientName}</div>
                  <div className="text-xs text-muted-foreground">Started {format(new Date(session.sessionStartedAt), "p")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isConnected ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                    {isConnected ? "Live" : "Connecting…"}
                  </span>
                  <button className="inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground" onClick={() => void endSession()}>
                    <Square className="h-3.5 w-3.5" /> End Session
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-3 gap-3">
                <Stat label="SpO₂" unit="%" value={latestVital?.spo2 != null ? Number(latestVital.spo2).toFixed(1) : "—"} />
                <Stat label="Heart rate" unit="bpm" value={latestVital?.heart_rate ?? "—"} />
                <Stat label="Temp" unit="°C" value={latestVital?.body_temperature != null ? Number(latestVital.body_temperature).toFixed(1) : "—"} />
              </div>

              {vitals.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitals.map((v) => ({ t: format(new Date(v.measured_at), "HH:mm:ss"), spo2: v.spo2, hr: v.heart_rate, temp: v.body_temperature }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="t" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Line dataKey="spo2" name="SpO₂" stroke="var(--color-primary)" dot={false} isAnimationActive={false} />
                      <Line dataKey="hr" name="HR" stroke="var(--color-destructive)" dot={false} isAnimationActive={false} />
                      <Line dataKey="temp" name="Temp" stroke="var(--color-muted-foreground)" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for the first reading…</p>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="rounded-lg border border-border p-4 text-center">
      <div className="font-serif italic text-3xl leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label} {unit}</div>
    </div>
  );
}


