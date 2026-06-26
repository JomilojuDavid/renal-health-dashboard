import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/nurse/alerts")({ component: AlertsPage, ssr: false });

function AlertsPage() {
  const qc = useQueryClient();
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["all-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*,patients(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });

  const ack = async (id: string) => {
    const { error } = await supabase.from("alerts").update({ status: "Acknowledged", acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Alert acknowledged");
    qc.invalidateQueries({ queryKey: ["all-alerts"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">Threshold breaches across all patients.</p>
      </div>
      {isLoading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No alerts.</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              {["Patient", "Alert", "Value", "Time", "Status", ""].map(h => <th key={h} className="text-left p-4 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{a.patients?.name}</td>
                  <td className="p-4"><span className="inline-flex h-6 items-center px-2.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">{a.type}</span></td>
                  <td className="p-4 font-serif italic">{a.value}</td>
                  <td className="p-4 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex h-6 items-center px-2.5 rounded-full text-xs font-medium ${a.status === "New" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{a.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    {a.status === "New" && <button onClick={() => ack(a.id)} className="h-8 px-3 rounded-lg border border-border text-xs hover:bg-accent">Acknowledge</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
