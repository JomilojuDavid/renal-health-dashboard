// src/hooks/useSensorSimulation.ts
import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

interface SimulationConfig {
  interval?: number; // milliseconds between readings
  enabled?: boolean;
}

interface SensorReadings {
  spo2: number;
  heart_rate: number;
  body_temperature: number;
}

export function useSensorSimulation(config: SimulationConfig = {}) {
  const { interval = 5000, enabled = false } = config;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(
    createClient(
      import.meta.env.VITE_SUPABASE_URL || "",
      import.meta.env.VITE_SUPABASE_ANON_KEY || ""
    )
  );

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
            device_id: "simulator-001", // Identify as simulated
          },
        ])
        .select();

      if (error) {
        console.error("❌ Failed to insert reading:", error.message);
      } else {
        console.log("✓ Simulated reading inserted:", readings);
      }
    } catch (err) {
      console.error("Error inserting reading:", err);
    }
  }, [generateReadings]);

  // Start/stop simulation
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("⏸️ Simulation stopped");
      }
      return;
    }

    console.log("▶️ Starting sensor simulation...");
    
    // Insert immediately, then at intervals
    insertReading();
    
    intervalRef.current = setInterval(() => {
      insertReading();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, insertReading]);

  return {
    isSimulating: enabled,
  };
}
