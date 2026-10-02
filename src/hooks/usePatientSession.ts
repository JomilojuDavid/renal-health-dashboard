import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PatientSession {
  sessionId: string;
  patientId: string;
  patientName: string;
  sessionStartedAt: string;
  telemetryStartsAt: string;
}

let current: PatientSession | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

async function closeSession(session: PatientSession, updates: Record<string, unknown> = {}) {
  await Promise.all([
    supabase.from("sessions").update({ ended_at: new Date().toISOString(), ...updates }).eq("id", session.sessionId),
    supabase.from("patients").update({ status: "Resting" }).eq("id", session.patientId),
  ]);
}

/** Shared active patient session, persisted as a row in `sessions`. */
export function usePatientSession() {
  const session = useSyncExternalStore(subscribe, () => current, () => null);

  const startSession = useCallback(async (patientId: string, patientName: string) => {
    if (current?.patientId === patientId) return current;
    const clickedAt = Date.now();
    if (current) {
      const ending = current;
      current = null;
      emit();
      await closeSession(ending);
    }

    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ patient_id: patientId, nurse_id: auth.user?.id ?? null, started_at: new Date(clickedAt).toISOString() })
      .select("id, started_at")
      .single();
    if (error) throw error;
    await supabase.from("patients").update({ status: "Active" }).eq("id", patientId);

    current = {
      sessionId: data.id,
      patientId,
      patientName,
      sessionStartedAt: data.started_at,
      telemetryStartsAt: new Date(clickedAt + 7000).toISOString(),
    };
    emit();
    return current;
  }, []);

  const endSession = useCallback(async (updates: Record<string, unknown> = {}) => {
    if (!current) return;
    const ending = current;
    current = null;
    emit();
    await closeSession(ending, updates);
  }, []);

  return { session, startSession, endSession };
}
