import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from "recharts";

export const Route = createFileRoute("/patient/vitals")({ component: PatientVitals, ssr: false });

type Range = "7d" | "30d" | "all";

function PatientVitals() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");

  const { data: patient } = useQuery({
    queryKey: ["my-patient-v", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("patients").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ["my-vitals", patient?.id, range],
    enabled: !!patient,
    queryFn: async () => {
      let q = supabase.from("vitals").select("hr,spo2,temp,recorded_at").eq("patient_id", patient!.id).order("recorded_at");
      if (range !== "all") {
        const days = range === "7d" ? 7 : 30;
        q = q.gte("recorded_at", new Date(Date.now() - days * 86400000).toISOString());
      }
      return (await q).data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Vitals</h1>
        <p className="text-sm text-muted-foreground">Trends over time.</p>
      </div>
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {(["7d", "30d", "all"] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={`px-3 h-8 rounded-full text-xs font-medium ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {r === "all" ? "All time" : r === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      <Chart title="Heart rate (bpm)" data={vitals} dataKey="hr" color="var(--color-primary)" healthy={[60, 100]} />
      <Chart title="SpO₂ (%)" data={vitals} dataKey="spo2" color="var(--color-success)" healthy={[94, 100]} />
      <Chart title="Temperature (°C)" data={vitals} dataKey="temp" color="var(--color-warning)" healthy={[36, 37.5]} />
    </div>
  );
}

function Chart({ title, data, dataKey, color, healthy }: { title: string; data: any[]; dataKey: string; color: string; healthy: [number, number] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      <div className="h-44">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="recorded_at" tick={{ fontSize: 10 }} tickFormatter={v => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
            <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <ReferenceArea y1={healthy[0]} y2={healthy[1]} fill="var(--color-success)" fillOpacity={0.08} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
