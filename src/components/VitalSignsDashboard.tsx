// src/components/VitalSignsDashboard.tsx
import { useVitalSignsSubscription } from "@/hooks/useVitalSignsSubscription";
import { SensorSimulationControl } from "@/components/SensorSimulationControl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Wifi, WifiOff, Loader2 } from "lucide-react";

export function VitalSignsDashboard() {
  const { vitals, latestVital, isConnected, isLoading, error } =
    useVitalSignsSubscription(50);

  const chartData = vitals.map((vital) => ({
    timestamp: format(new Date(vital.measured_at), "HH:mm:ss"),
    spo2: vital.spo2,
    heart_rate: vital.heart_rate,
    body_temp: vital.body_temperature,
  }));

  // Determine status badge colors
  const getSpO2Status = (spo2: number) => {
    if (spo2 >= 95) return { color: "bg-green-50", textColor: "text-green-600", label: "Normal" };
    if (spo2 >= 90) return { color: "bg-yellow-50", textColor: "text-yellow-600", label: "Low" };
    return { color: "bg-red-50", textColor: "text-red-600", label: "Critical" };
  };

  const getHRStatus = (hr: number) => {
    if (hr >= 60 && hr <= 100) return { color: "bg-green-50", textColor: "text-green-600", label: "Normal" };
    if (hr < 60) return { color: "bg-blue-50", textColor: "text-blue-600", label: "Low" };
    return { color: "bg-red-50", textColor: "text-red-600", label: "High" };
  };

  const getTempStatus = (temp: number) => {
    if (temp >= 36.5 && temp <= 37.5) return { color: "bg-green-50", textColor: "text-green-600", label: "Normal" };
    if (temp < 36.5) return { color: "bg-blue-50", textColor: "text-blue-600", label: "Low" };
    return { color: "bg-red-50", textColor: "text-red-600", label: "High" };
  };

  return (
    <div className="w-full space-y-4 p-6">
      {/* Header with Status */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vital Signs Monitor</h1>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="bg-green-50">
                Live Connected
              </Badge>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-orange-600" />
              <Badge variant="outline" className="bg-orange-50">
                Offline
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Sensor Simulator Control */}
      <SensorSimulationControl />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading vital signs...</span>
        </div>
      )}

      {/* Latest Vital Stats Cards */}
      {latestVital && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SpO2 */}
          {(() => {
            const status = getSpO2Status(latestVital.spo2);
            return (
              <div className={`${status.color} border border-current rounded-lg p-4`}>
                <p className="text-sm text-gray-600">Oxygen Saturation</p>
                <p className={`text-4xl font-bold ${status.textColor}`}>
                  {latestVital.spo2.toFixed(1)}%
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    {format(new Date(latestVital.measured_at), "p")}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {status.label}
                  </Badge>
                </div>
              </div>
            );
          })()}

          {/* Heart Rate */}
          {(() => {
            const status = getHRStatus(latestVital.heart_rate);
            return (
              <div className={`${status.color} border border-current rounded-lg p-4`}>
                <p className="text-sm text-gray-600">Heart Rate</p>
                <p className={`text-4xl font-bold ${status.textColor}`}>
                  {latestVital.heart_rate} bpm
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    {latestVital.heart_rate < 60 ? "↓ Low" : latestVital.heart_rate > 100 ? "↑ High" : "→ Normal"}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {status.label}
                  </Badge>
                </div>
              </div>
            );
          })()}

          {/* Body Temperature */}
          {(() => {
            const status = getTempStatus(latestVital.body_temperature);
            return (
              <div className={`${status.color} border border-current rounded-lg p-4`}>
                <p className="text-sm text-gray-600">Body Temperature</p>
                <p className={`text-4xl font-bold ${status.textColor}`}>
                  {latestVital.body_temperature.toFixed(1)}°C
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    {latestVital.body_temperature < 36.5 ? "↓ Low" : latestVital.body_temperature > 37.5 ? "↑ High" : "→ Normal"}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {status.label}
                  </Badge>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Real-Time Chart */}
      {!isLoading && vitals.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Trend Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="left"
                domain={[88, 100]}
                label={{
                  value: "SpO2 (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[40, 120]}
                label={{
                  value: "HR (bpm) / Temp (°C × 10)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spo2"
                stroke="#3b82f6"
                name="SpO2 (%)"
                isAnimationActive={false}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="heart_rate"
                stroke="#ef4444"
                name="Heart Rate (bpm)"
                isAnimationActive={false}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="body_temp"
                stroke="#f59e0b"
                name="Temp (°C)"
                isAnimationActive={false}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && vitals.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No vital signs recorded yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Click "Start" above to simulate sensor data
          </p>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && vitals.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-right">SpO2</th>
                  <th className="px-4 py-2 text-right">HR</th>
                  <th className="px-4 py-2 text-right">Temp</th>
                  <th className="px-4 py-2 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vitals
                  .slice(-15)
                  .reverse()
                  .map((vital) => (
                    <tr key={vital.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {format(new Date(vital.measured_at), "HH:mm:ss")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {vital.spo2.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {vital.heart_rate} bpm
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {vital.body_temperature.toFixed(1)}°C
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          {vital.device_id === "simulator-001"
                            ? "🎮 Simulated"
                            : "📱 Device"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {!isLoading && vitals.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
          <p>
            📊 Total readings: <strong>{vitals.length}</strong> | Latest:{" "}
            <strong>
              {latestVital && format(new Date(latestVital.created_at), "p")}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
