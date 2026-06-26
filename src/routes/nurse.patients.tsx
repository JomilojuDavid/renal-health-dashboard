import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Trash2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "./nurse.index";
import { toast } from "sonner";

export const Route = createFileRoute("/nurse/patients")({
  component: PatientsPage,
  ssr: false,
});

type Form = { name: string; age: string; gender: string; diagnosis: string; contact: string; dialysis_frequency: string };
const emptyForm: Form = { name: "", age: "", gender: "", diagnosis: "", contact: "", dialysis_frequency: "3x/week" };

function PatientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["all-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lastSessions = {} } = useQuery({
    queryKey: ["last-sessions"],
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("patient_id,started_at").order("started_at", { ascending: false }).limit(200);
      const map: Record<string, string> = {};
      for (const s of (data ?? []) as any[]) if (!map[s.patient_id]) map[s.patient_id] = s.started_at;
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        diagnosis: form.diagnosis || null,
        contact: form.contact || null,
        dialysis_frequency: form.dialysis_frequency || null,
      };
      if (editing) {
        const { error } = await supabase.from("patients").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Patient updated" : "Patient added");
      setModalOpen(false); setEditing(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["all-patients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Patient deleted"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = patients.filter((p: any) => {
    const matchesQ = !q || p.name.toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">Complete patient roster.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setModalOpen(true); }} className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Patient
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients…" className="h-10 w-full pl-9 pr-3 rounded-lg border border-border bg-card text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-card text-sm">
          {["All", "Active", "Resting", "Critical"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase tracking-wide">
            <tr className="border-b border-border">
              {["Name", "Age", "Diagnosis", "Frequency", "Last Session", "Status", ""].map((h) => (
                <th key={h} className="text-left font-medium p-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-6 bg-muted rounded animate-pulse" /></td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No patients match.</td></tr>
            ) : filtered.map((p: any) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4 text-muted-foreground">{p.age ?? "—"}</td>
                <td className="p-4 text-muted-foreground">{p.diagnosis ?? "—"}</td>
                <td className="p-4 text-muted-foreground">{p.dialysis_frequency ?? "—"}</td>
                <td className="p-4 text-muted-foreground">{(lastSessions as any)[p.id] ? new Date((lastSessions as any)[p.id]).toLocaleDateString() : "—"}</td>
                <td className="p-4"><StatusBadge status={p.status} /></td>
                <td className="p-4">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => { setEditing(p.id); setForm({ name: p.name, age: p.age?.toString() ?? "", gender: p.gender ?? "", diagnosis: p.diagnosis ?? "", contact: p.contact ?? "", dialysis_frequency: p.dialysis_frequency ?? "" }); setModalOpen(true); }} className="h-8 w-8 grid place-items-center rounded hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => confirm(`Delete ${p.name}?`) && remove.mutate(p.id)} className="h-8 w-8 grid place-items-center rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit Patient" : "Add Patient"}</h2>
              <button onClick={() => setModalOpen(false)} className="h-8 w-8 grid place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid grid-cols-2 gap-3">
              {[
                ["name", "Name", "text", true],
                ["age", "Age", "number", false],
                ["gender", "Gender", "text", false],
                ["diagnosis", "Diagnosis", "text", false],
                ["contact", "Contact", "text", false],
                ["dialysis_frequency", "Dialysis frequency", "text", false],
              ].map(([k, label, type, req]) => (
                <label key={k as string} className={k === "name" || k === "diagnosis" ? "col-span-2" : ""}>
                  <span className="text-xs font-medium mb-1 block">{label as string}</span>
                  <input
                    type={type as string}
                    required={req as boolean}
                    value={(form as any)[k as string]}
                    onChange={(e) => setForm({ ...form, [k as string]: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm"
                  />
                </label>
              ))}
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="h-10 px-4 rounded-lg border border-border text-sm">Cancel</button>
                <button disabled={save.isPending} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">{save.isPending ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
