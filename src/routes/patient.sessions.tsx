import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/patient/sessions")({ component: PatientSessions, ssr: false });

function PatientSessions() {
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null);

  const { data: patient } = useQuery({
    queryKey: ["my-patient-s", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("patients").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["my-sessions", patient?.id],
    enabled: !!patient,
    queryFn: async () => (await supabase.from("sessions").select("*").eq("patient_id", patient!.id).order("started_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">Your dialysis history.</p>
      </div>
      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No sessions recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => {
            const isOpen = open === s.id;
            const duration = s.ended_at ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000) : null;
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <div className="font-medium">{new Date(s.started_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
                    <div className="text-xs text-muted-foreground">{duration ? `${duration} min · ` : "In progress · "}{new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-sm space-y-2 border-t border-border pt-3">
                    {s.systolic && <div><span className="text-muted-foreground">BP: </span>{s.systolic}/{s.diastolic} mmHg</div>}
                    <div className="text-muted-foreground">{s.notes || "No notes recorded."}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
