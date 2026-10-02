import { useState, useEffect } from "react";
import { usePatientSession } from "@/hooks/usePatientSession";
import { useVitalSignsSubscription } from "@/hooks/useVitalSignsSubscription";
import { useSensorSimulation } from "@/hooks/useSensorSimulation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User, LogOut, Play } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
}

// Mock patient data - replace with API call
const MOCK_PATIENTS: Patient[] = [
  { id: "P001", name: "John Smith", age: 65, condition: "ESRD" },
  { id: "P002", name: "Sarah Johnson", age: 52, condition: "CKD Stage 4" },
  { id: "P003", name: "Michael Chen", age: 71, condition: "ESRD" },
  { id: "P004", name: "Emma Williams", age: 48, condition: "ESRD" },
];

export function PatientList() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const { startSession, stopSession, getCurrentSession } = usePatientSession();
  const { vitals, latestVital } = useVitalSignsSubscription(10);
  useSensorSimulation({ autoStart: true });

  const activeSession = getCurrentSession();

  const handlePatientClick = (patient: Patient) => {
    // If already in session, end it first
    if (activeSession) {
      stopSession();
    }

    // Start new session
    startSession(patient.id, patient.name);
    setSelectedPatient(patient);
  };

  const handleEndSession = () => {
    stopSession();
    setSelectedPatient(null);
    setShowEndDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Active Session Header */}
      {activeSession && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Session</p>
              <p className="text-lg font-semibold text-blue-900">
                {activeSession.patientName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Started at{" "}
                {activeSession.sessionStartedAt.toLocaleTimeString()}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndDialog(true)}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              End Session
            </Button>
          </div>

          {/* Quick Stats */}
          {latestVital && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
              <div className="text-center">
                <p className="text-xs text-gray-600">SpO2</p>
                <p className="font-semibold text-blue-600">
                  {latestVital.spo2.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">HR</p>
                <p className="font-semibold text-red-600">
                  {latestVital.heart_rate} bpm
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Temp</p>
                <p className="font-semibold text-orange-600">
                  {latestVital.body_temperature.toFixed(1)}°C
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MOCK_PATIENTS.map((patient) => (
          <div
            key={patient.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              activeSession?.patientId === patient.id
                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-200"
                : "hover:bg-gray-50 border-gray-200"
            }`}
            onClick={() => handlePatientClick(patient)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gray-200 rounded-full p-2">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-600">
                    {patient.age} years • {patient.condition}
                  </p>
                </div>
              </div>
              {activeSession?.patientId === patient.id && (
                <Badge className="bg-green-100 text-green-800">
                  Recording
                </Badge>
              )}
            </div>

            {activeSession?.patientId === patient.id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                disabled
              >
                <Play className="w-3 h-3 animate-pulse" />
                Session Active
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* End Session Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Patient Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Ending the session will stop recording vital signs for{" "}
              <strong>{activeSession?.patientName}</strong>. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {vitals.length > 0 && (
              <p className="text-sm text-gray-600">
                Total readings recorded: <strong>{vitals.length}</strong>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel>Keep Recording</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              className="bg-red-600 hover:bg-red-700"
            >
              End Session
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
