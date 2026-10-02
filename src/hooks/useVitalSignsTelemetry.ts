import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PatientSession } from "./usePatientSession";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundTo = (value: number, places: number) => Number(value.toFixed(places));

/** Writes session readings after the click-anchored start delay. */
export function useVitalSignsTelemetry(session: PatientSession | null) {
  useEffect(() => {
    if (!session) return;

    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    let heartRate = 72 + Math.floor(Math.random() * 7);
    let spo2 = roundTo(97.5 + Math.random(), 1);
    let temperature = roundTo(36.6 + Math.random() * 0.2, 2);

    const writeReading = async () => {
      if (!active) return;

      const { error } = await supabase.from("vital_sign_logs").insert({
        patient_id: session.patientId,
        session_id: session.sessionId,
        session_started_at: session.sessionStartedAt,
        spo2,
        heart_rate: heartRate,
        body_temperature: temperature,
      });

      if (error) return;
      heartRate = clamp(heartRate + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)), 64, 88);
      spo2 = roundTo(clamp(spo2 + (Math.random() < 0.5 ? -0.2 : 0.2), 96, 99.5), 1);
      temperature = roundTo(clamp(temperature + (Math.random() < 0.5 ? -0.05 : 0.05), 36.4, 37.2), 2);
    };

    const startTimer = setTimeout(() => {
      if (!active) return;
      void writeReading().catch(() => {});
      interval = setInterval(() => {
        void writeReading().catch(() => {});
      }, 5000);
    }, Math.max(0, new Date(session.telemetryStartsAt).getTime() - Date.now()));

    return () => {
      active = false;
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [session]);
}