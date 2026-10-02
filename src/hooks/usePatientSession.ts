import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PatientSession {
  sessionId: string;
  patientId: string;
  patientName: string;
  sessionStartedAt: string;
}

let current: PatientSession | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

async function closeSession(session: PatientSession) {
  await Promise.all([
    supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", session.sessionId),
    supabase.from("patients").update({ status: "Resting" }).eq("id", session.patientId),
  ]);
}

/** Shared active patient session, persisted as a row in `sessions`. */
export function usePatientSession() {
  const session = useSyncExternalStore(subscribe, () => current, () => null);

  const startSession = useCallback(async (patientId: string, patientName: string) => {
    if (current?.patientId === patientId) return current;
    if (current) await closeSession(current);

    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ patient_id: patientId, nurse_id: auth.user?.id ?? null })
      .select("id, started_at")
      .single();
    if (error) throw error;
    await supabase.from("patients").update({ status: "Active" }).eq("id", patientId);

    current = { sessionId: data.id, patientId, patientName, sessionStartedAt: data.started_at };
    emit();
    return current;
  }, []);

  const endSession = useCallback(async () => {
    if (!current) return;
    const ending = current;
    current = null;
    emit();
    await closeSession(ending);
  }, []);

  return { session, startSession, endSession };
}
