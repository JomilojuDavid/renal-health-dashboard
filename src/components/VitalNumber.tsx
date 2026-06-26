import type { ReactNode } from "react";

export function VitalNumber({ value, unit, trend }: { value: ReactNode; unit?: string; trend?: "up" | "down" | "flat" }) {
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "→" : null;
  const arrowColor = trend === "up" ? "text-destructive" : trend === "down" ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-serif italic text-5xl leading-none tracking-tight">{value}</span>
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      {arrow && <span className={`text-base ${arrowColor}`}>{arrow}</span>}
    </div>
  );
}
