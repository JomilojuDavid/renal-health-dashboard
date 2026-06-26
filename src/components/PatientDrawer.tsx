import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VitalNumber } from "@/components/VitalNumber";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export function PatientDrawer({ patientId, onClose }: { patientId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", patientId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ["patient-vitals", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("vitals")
        .select("hr,spo2,temp,recorded_at")
        .eq("patient_id", patientId!)
        .gte("recorded_at", since)
        .order("recorded_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: activeSession } = useQuery({
    queryKey: ["patient-active-session", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("patient_id", patientId!)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (activeSession) {
      setNotes(activeSession.notes ?? "");
      setSys(activeSession.systolic?.toString() ?? "");
      setDia(activeSession.diastolic?.toString() ?? "");
    } else {
      setNotes(""); setSys(""); setDia("");
    }
  }, [activeSession?.id]);

  if (!patientId) return null;

  const latest = vitals.at(-1) as any;
  const prev = vitals.at(-2) as any;
  const trend = (k: "hr" | "spo2" | "temp"): "up" | "down" | "flat" | undefined => {
    if (!latest || !prev) return;
    const d = Number(latest[k]) - Number(prev[k]);
    if (Math.abs(d) < 0.5) return "flat";
    return d > 0 ? "up" : "down";
  };

  const startSession = async () => {
    const { error } = await supabase.from("sessions").insert({ patient_id: patientId });
    if (error) return toast.error(error.message);
    await supabase.from("patients").update({ status: "Active" }).eq("id", patientId);
    toast.success("Session started");
    qc.invalidateQueries();
  };

  const endSession = async () => {
    if (!activeSession) return;
    const { error } = await supabase.from("sessions").update({
      ended_at: new Date().toISOString(),
      notes,
      systolic: sys ? parseInt(sys) : null,
      diastolic: dia ? parseInt(dia) : null,
    }).eq("id", activeSession.id);
    if (error) return toast.error(error.message);
    await supabase.from("patients").update({ status: "Resting" }).eq("id", patientId);
    toast.success("Session ended");
    qc.invalidateQueries();
  };

  const saveNotes = async () => {
    if (!activeSession) return toast.error("No active session");
    const { error } = await supabase.from("sessions").update({
      notes, systolic: sys ? parseInt(sys) : null, diastolic: dia ? parseInt(dia) : null,
    }).eq("id", activeSession.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center font-medium">
              {patient?.name?.[0] ?? "P"}
            </div>
            <div>
              <div className="font-medium">{patient?.name ?? "Loading…"}</div>
              <div className="text-xs text-muted-foreground">{patient?.age ? `${patient.age}y · ` : ""}{patient?.dialysis_frequency ?? "—"}</div>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Heart Rate</div>
              <VitalNumber value={latest?.hr ? Math.round(Number(latest.hr)) : "—"} unit="bpm" trend={trend("hr")} />
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">SpO₂</div>
              <VitalNumber value={latest?.spo2 ? Math.round(Number(latest.spo2)) : "—"} unit="%" trend={trend("spo2")} />
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Temp</div>
              <VitalNumber value={latest?.temp ? Number(latest.temp).toFixed(1) : "—"} unit="°C" trend={trend("temp")} />
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Blood pressure</div>
            <div className="flex gap-2">
              <input value={sys} onChange={(e) => setSys(e.target.value)} placeholder="Systolic" className="h-10 w-28 rounded-lg border border-border bg-background px-3 text-sm" />
              <span className="self-center text-muted-foreground">/</span>
              <input value={dia} onChange={(e) => setDia(e.target.value)} placeholder="Diastolic" className="h-10 w-28 rounded-lg border border-border bg-background px-3 text-sm" />
              <span className="self-center text-xs text-muted-foreground">mmHg</span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Session notes</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-lg border border-border bg-background p-3 text-sm" placeholder="Observations during this session…" />
            <button onClick={saveNotes} className="mt-2 h-9 px-3 rounded-lg border border-border text-sm hover:bg-accent">Save notes</button>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Vitals — last 7 days</div>
            <div className="h-56 rounded-lg border border-border p-3">
              <ResponsiveContainer>
                <LineChart data={vitals}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="recorded_at" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="hr" stroke="var(--color-primary)" dot={false} />
                  <Line type="monotone" dataKey="spo2" stroke="var(--color-success)" dot={false} />
                  <Line type="monotone" dataKey="temp" stroke="var(--color-warning)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border">
          {activeSession ? (
            <button onClick={endSession} className="h-11 w-full rounded-lg bg-destructive text-destructive-foreground font-medium">End session</button>
          ) : (
            <button onClick={startSession} className="h-11 w-full rounded-lg bg-primary text-primary-foreground font-medium">Start session</button>
          )}
        </div>
      </div>
    </div>
  );
}
