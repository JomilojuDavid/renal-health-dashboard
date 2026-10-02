import { createFileRoute } from "@tanstack/react-router";
import { PatientList } from "@/components/PatientList";
import { VitalSignsDashboard } from "@/components/VitalSignsDashboard";

export const Route = createFileRoute("/dashboard/")({component: DashboardPage});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List - Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-4 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Patients</h2>
              <PatientList />
            </div>
          </div>

          {/* Vital Signs Dashboard - Main */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border">
              <VitalSignsDashboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
