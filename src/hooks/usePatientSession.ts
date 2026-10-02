import { useCallback, useRef } from "react";
import { useSensorSimulation } from "./useSensorSimulation";

export interface PatientSession {
  patientId: string;
  patientName: string;
  sessionStartedAt: Date;
  isActive: boolean;
}

const sessionState = {
  current: null as PatientSession | null,
  listeners: new Set<(session: PatientSession | null) => void>(),
};

export function usePatientSession() {
  const sessionRef = useRef(sessionState.current);

  const startSession = useCallback(
    (patientId: string, patientName: string) => {
      const session: PatientSession = {
        patientId,
        patientName,
        sessionStartedAt: new Date(),
        isActive: true,
      };

      sessionState.current = session;
      sessionRef.current = session;

      // Notify all subscribers
      sessionState.listeners.forEach((listener) => listener(session));

      console.log(`✓ Session started for ${patientName} (${patientId})`);
      return session;
    },
    []
  );

  const stopSession = useCallback(() => {
    if (sessionState.current) {
      const patientName = sessionState.current.patientName;
      sessionState.current = null;
      sessionRef.current = null;

      // Notify all subscribers
      sessionState.listeners.forEach((listener) => listener(null));

      console.log(`⏹️ Session stopped for ${patientName}`);
    }
  }, []);

  const getCurrentSession = useCallback(() => {
    return sessionState.current;
  }, []);

  const subscribeToSession = useCallback(
    (listener: (session: PatientSession | null) => void) => {
      sessionState.listeners.add(listener);
      return () => {
        sessionState.listeners.delete(listener);
      };
    },
    []
  );

  return {
    startSession,
    stopSession,
    getCurrentSession,
    subscribeToSession,
    currentSession: sessionRef.current,
  };
}