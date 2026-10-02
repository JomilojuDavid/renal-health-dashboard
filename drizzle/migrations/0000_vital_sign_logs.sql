CREATE TABLE public.vital_sign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  session_started_at timestamptz NOT NULL,
  spo2 numeric,
  heart_rate integer,
  body_temperature numeric,
  measured_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid DEFAULT auth.uid()
);
CREATE INDEX vital_sign_logs_patient_time_idx ON public.vital_sign_logs (patient_id, measured_at DESC);
GRANT SELECT, INSERT ON public.vital_sign_logs TO authenticated;
GRANT ALL ON public.vital_sign_logs TO service_role;
ALTER TABLE public.vital_sign_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurses read vital logs" ON public.vital_sign_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'nurse'));
CREATE POLICY "nurses insert vital logs" ON public.vital_sign_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'nurse'));
CREATE POLICY "patient reads own vital logs" ON public.vital_sign_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = vital_sign_logs.patient_id AND p.user_id = auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.vital_sign_logs;