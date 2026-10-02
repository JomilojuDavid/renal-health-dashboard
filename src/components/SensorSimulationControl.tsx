// src/components/SensorSimulationControl.tsx
import { useState } from "react";
import { useSensorSimulation } from "@/hooks/useSensorSimulation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Activity } from "lucide-react";

interface SensorSimulationControlProps {
  onToggle?: (enabled: boolean) => void;
}

export function SensorSimulationControl({
  onToggle,
}: SensorSimulationControlProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [interval, setInterval] = useState(5000);

  const { isSimulating } = useSensorSimulation({
    enabled: isEnabled,
    interval,
  });

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle?.(newState);
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-purple-900">Sensor Simulator</h3>
            <p className="text-sm text-purple-700">
              Generate realistic vital sign readings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSimulating && (
            <Badge className="bg-green-100 text-green-800 animate-pulse">
              Running
            </Badge>
          )}

          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            disabled={isSimulating}
            className="px-2 py-1 text-sm border rounded-md disabled:opacity-50"
          >
            <option value={2000}>Every 2s</option>
            <option value={5000}>Every 5s</option>
            <option value={10000}>Every 10s</option>
            <option value={30000}>Every 30s</option>
          </select>

          <Button
            onClick={handleToggle}
            variant={isSimulating ? "destructive" : "default"}
            size="sm"
            className="gap-2"
          >
            {isSimulating ? (
              <>
                <Square className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
