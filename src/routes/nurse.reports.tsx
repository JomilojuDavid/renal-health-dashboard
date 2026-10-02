import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

export const Route = createFileRoute("/nurse/reports")({ component: ReportsPage, ssr: false });

function ReportsPage() {
  const [patientId, setPatientId] = useState<string>("all");
  const [from, setFrom] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0, 10));

  const { data: patients = [] } = useQuery({
    queryKey: ["report-patients"],
    queryFn: async () => (await supabase.from("patients").select("id,name").order("name")).data ?? [],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["reports", patientId, from, to],
    queryFn: async () => {
      let q = supabase.from("sessions").select("*,patients(name)").gte("started_at", from).lte("started_at", to + "T23:59:59");
      if (patientId !== "all") q = q.eq("patient_id", patientId);
      const { data, error } = await q.order("started_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["reports-alerts", patientId, from, to],
    queryFn: async () => {
      let q = supabase.from("alerts").select("id").gte("created_at", from).lte("created_at", to + "T23:59:59");
      if (patientId !== "all") q = q.eq("patient_id", patientId);
      return (await q).data ?? [];
    },
  });

  const { data: readings = [] } = useQuery({
    queryKey: ["reports-readings", patientId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("vital_sign_logs")
        .select("id, patient_id, measured_at, spo2, heart_rate, body_temperature, patients(name)")
        .gte("measured_at", from)
        .lte("measured_at", to + "T23:59:59");
      if (patientId !== "all") q = q.eq("patient_id", patientId);
      const { data, error } = await q.order("measured_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.ended_at);
    const durations = completed.map(s => (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    return {
      total: sessions.length,
      avgDuration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      alerts: alerts.length,
      readings: readings.length,
    };
  }, [sessions, alerts, readings]);

  const exportCsv = () => {
    const sessionRows = [["Patient", "Started", "Ended", "Duration (min)", "Notes", "BP"], ...sessions.map((s: any) => [
      s.patients?.name ?? "", s.started_at, s.ended_at ?? "",
      s.ended_at ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000).toString() : "",
      (s.notes ?? "").replace(/[\n,]/g, " "),
      s.systolic ? `${s.systolic}/${s.diastolic}` : "",
    ])];
    const readingRows = [["Patient", "Measured at", "SpO₂ (%)", "Heart rate (bpm)", "Temperature (°C)"], ...readings.map((r: any) => [
      r.patients?.name ?? r.patient_id,
      r.measured_at,
      r.spo2 != null ? String(r.spo2) : "",
      r.heart_rate != null ? String(r.heart_rate) : "",
      r.body_temperature != null ? String(r.body_temperature) : "",
    ])];
    const csv = [...sessionRows, [], ["Readings"], ...readingRows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `renalwatch-report-${from}-${to}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Session analytics across selected window.</p>
        </div>
        <button onClick={exportCsv} className="h-10 px-4 inline-flex items-center gap-2 rounded-lg border border-border text-sm hover:bg-accent">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col text-xs"><span className="mb-1 text-muted-foreground">Patient</span>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-card text-sm">
            <option value="all">All patients</option>
            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs"><span className="mb-1 text-muted-foreground">From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-card text-sm" />
        </label>
        <label className="flex flex-col text-xs"><span className="mb-1 text-muted-foreground">To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-card text-sm" />
        </label>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Total Sessions" value={stats.total} />
        <Stat label="Avg Duration" value={`${stats.avgDuration}m`} />
        <Stat label="Alerts" value={stats.alerts} />
        <Stat label="Readings" value={stats.readings} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {["Patient", "Started", "Duration", "BP", "Notes"].map(h => <th key={h} className="text-left p-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {sessions.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No sessions in range.</td></tr> :
              sessions.map((s: any) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{s.patients?.name}</td>
                  <td className="p-4 text-muted-foreground">{new Date(s.started_at).toLocaleString()}</td>
                  <td className="p-4">{s.ended_at ? `${Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)}m` : "—"}</td>
                  <td className="p-4">{s.systolic ? `${s.systolic}/${s.diastolic}` : "—"}</td>
                  <td className="p-4 text-muted-foreground truncate max-w-xs">{s.notes ?? "—"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-3 text-sm font-medium">Recorded readings</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {["Patient", "Measured", "SpO₂", "Heart rate", "Temp"].map(h => <th key={h} className="text-left p-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {readings.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No readings recorded in range.</td></tr> :
              readings.map((r: any) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{r.patients?.name ?? r.patient_id}</td>
                  <td className="p-4 text-muted-foreground">{new Date(r.measured_at).toLocaleString()}</td>
                  <td className="p-4">{r.spo2 != null ? Number(r.spo2).toFixed(1) : "—"}</td>
                  <td className="p-4">{r.heart_rate ?? "—"}</td>
                  <td className="p-4">{r.body_temperature != null ? Number(r.body_temperature).toFixed(1) : "—"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif italic text-4xl">{value}</div>
    </div>
  );
}
