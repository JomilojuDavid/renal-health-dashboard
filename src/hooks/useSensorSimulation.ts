import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { usePatientSession } from "./usePatientSession";

interface SimulationConfig {
  interval?: number; // milliseconds between readings
  autoStart?: boolean; // Start when patient session begins
}

interface SensorReadings {
  spo2: number;
  heart_rate: number;
  body_temperature: number;
}

export function useSensorSimulation(config: SimulationConfig = {}) {
  const { interval = 5000, autoStart = true } = config;
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(
    createClient(
      import.meta.env.VITE_SUPABASE_URL || "",
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        ""
    )
  );
  const { getCurrentSession, subscribeToSession } = usePatientSession();

  // Generate realistic sensor readings using sine waves + noise
  const generateReadings = useCallback((): SensorReadings => {
    const now = Date.now();
    const seconds = now / 1000;

    return {
      // SpO2: 95-99% with slight oscillation
      spo2: 96.5 + 1.5 * Math.sin(seconds / 30) + (Math.random() - 0.5) * 0.5,

      // Heart Rate: 60-100 bpm with natural variation
      heart_rate: Math.round(
        75 + 15 * Math.sin(seconds / 25) + (Math.random() - 0.5) * 8
      ),

      // Body Temp: 36.5-37.5°C with gradual drift
      body_temperature:
        37.0 + 0.3 * Math.sin(seconds / 40) + (Math.random() - 0.5) * 0.1,
    };
  }, []);

  // Insert reading into Supabase
  const insertReading = useCallback(async () => {
    const session = getCurrentSession();
    if (!session) {
      console.warn("⚠️ No active session, skipping reading");
      return;
    }

    try {
      const readings = generateReadings();

      const { data, error } = await supabaseRef.current
        .from("vital_sign_logs")
        .insert([
          {
            spo2: parseFloat(readings.spo2.toFixed(1)),
            heart_rate: readings.heart_rate,
            body_temperature: parseFloat(readings.body_temperature.toFixed(2)),
            measured_at: new Date().toISOString(),
            patient_id: session.patientId,
            session_started_at: session.sessionStartedAt.toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error("❌ Failed to insert reading:", error.message);
      }
    } catch (err) {
      console.error("Error inserting reading:", err);
    }
  }, [generateReadings, getCurrentSession]);

  // Auto-start/stop based on session
  useEffect(() => {
    if (!autoStart) return;

    const unsubscribe = subscribeToSession((session) => {
      if (session) {
        // Session started - begin recording
        console.log("▶️ Auto-starting vital recording...");
        setIsRunning(true);

        // Insert first reading immediately
        insertReading();

        // Then at intervals
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          insertReading();
        }, interval);
      } else {
        // Session ended - stop recording
        console.log("⏹️ Auto-stopping vital recording...");
        setIsRunning(false);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return unsubscribe;
  }, [autoStart, interval, insertReading, subscribeToSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isRunning,
  };
}