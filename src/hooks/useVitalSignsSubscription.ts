import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PatientSession } from "./usePatientSession";

export interface VitalSignLog {
  id: string;
  patient_id: string;
  spo2: number | null;
  heart_rate: number | null;
  body_temperature: number | null;
  measured_at: string;
}

/** Loads and live-streams vital_sign_logs rows for the active session only. */
export function useVitalSignsSubscription(session: PatientSession | null, limit = 100) {
  const [vitals, setVitals] = useState<VitalSignLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVitals([]);
    setError(null);
    if (!session) {
      setIsConnected(false);
      return;
    }
    let cancelled = false;

    supabase
      .from("vital_sign_logs")
      .select("id, patient_id, spo2, heart_rate, body_temperature, measured_at")
      .eq("patient_id", session.patientId)
      .gte("measured_at", session.sessionStartedAt)
      .order("measured_at", { ascending: true })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setVitals((prev) => mergeRows(data as VitalSignLog[], prev, limit));
      });

    const channel = supabase
      .channel(`vital-logs-${session.sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vital_sign_logs", filter: `patient_id=eq.${session.patientId}` },
        (payload) => {
          const row = payload.new as VitalSignLog;
          if (row.measured_at < session.sessionStartedAt) return;
          setVitals((prev) => mergeRows(prev, [row], limit));
        },
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, limit]);

  return { vitals, latestVital: vitals[vitals.length - 1] ?? null, isConnected, error };
}

function mergeRows(a: VitalSignLog[], b: VitalSignLog[], limit: number) {
  const map = new Map<string, VitalSignLog>();
  [...a, ...b].forEach((r) => map.set(r.id, r));
  return [...map.values()].sort((x, y) => x.measured_at.localeCompare(y.measured_at)).slice(-limit);
}
