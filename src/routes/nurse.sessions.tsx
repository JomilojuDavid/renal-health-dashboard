import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/nurse/sessions")({ component: SessionsPage, ssr: false });

function SessionsPage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id,started_at,patient_id,patients(name,status)")
        .is("ended_at", null);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });

  const ids = sessions.map((s) => s.patient_id);
  const { data: vitals = {} } = useQuery({
    queryKey: ["sessions-vitals", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("vitals").select("patient_id,hr,spo2,temp,recorded_at").in("patient_id", ids).order("recorded_at", { ascending: false }).limit(ids.length * 5);
      const map: Record<string, any> = {};
      for (const v of (data ?? []) as any[]) if (!map[v.patient_id]) map[v.patient_id] = v;
      return map;
    },
    refetchInterval: 15000,
  });

  const { data: alertCounts = {} } = useQuery({
    queryKey: ["session-alerts", sessions.map(s => s.id)],
    enabled: sessions.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("alerts").select("session_id").in("session_id", sessions.map(s => s.id));
      const map: Record<string, number> = {};
      for (const a of (data ?? []) as any[]) map[a.session_id] = (map[a.session_id] ?? 0) + 1;
      return map;
    },
  });

  const endSession = async (id: string, patient_id: string) => {
    const { error } = await supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("patients").update({ status: "Resting" }).eq("id", patient_id);
    toast.success("Session ended");
    qc.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active Sessions</h1>
        <p className="text-sm text-muted-foreground">Live dialysis sessions in progress.</p>
      </div>
      {isLoading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No active sessions right now.</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              {["Patient", "Elapsed", "HR", "SpO₂", "Temp", "Alerts", ""].map(h => <th key={h} className="text-left p-4 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {sessions.map((s) => {
                const mins = Math.floor((now - new Date(s.started_at).getTime()) / 60000);
                const v = (vitals as any)[s.patient_id];
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{s.patients?.name}</td>
                    <td className="p-4 font-serif italic">{Math.floor(mins / 60)}h {mins % 60}m</td>
                    <td className="p-4">{v?.hr ? Math.round(v.hr) : "—"}</td>
                    <td className="p-4">{v?.spo2 ? Math.round(v.spo2) : "—"}</td>
                    <td className="p-4">{v?.temp ? Number(v.temp).toFixed(1) : "—"}</td>
                    <td className="p-4">{(alertCounts as any)[s.id] ?? 0}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => endSession(s.id, s.patient_id)} className="h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">End</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
