
-- Roles
CREATE TYPE public.app_role AS ENUM ('nurse', 'patient');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile on signup. Role assigned via signup metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INT,
  gender TEXT,
  diagnosis TEXT,
  dialysis_frequency TEXT,
  contact TEXT,
  nephrologist TEXT,
  emergency_contact TEXT,
  photo_url TEXT,
  assigned_nurse_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Resting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurses manage patients" ON public.patients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nurse')) WITH CHECK (public.has_role(auth.uid(), 'nurse'));
CREATE POLICY "patient reads own" ON public.patients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT,
  systolic INT,
  diastolic INT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurses manage sessions" ON public.sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nurse')) WITH CHECK (public.has_role(auth.uid(), 'nurse'));
CREATE POLICY "patient reads own sessions" ON public.sessions FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

-- Vitals
CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  hr NUMERIC,
  spo2 NUMERIC,
  temp NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vitals_patient_time ON public.vitals(patient_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurses manage vitals" ON public.vitals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nurse')) WITH CHECK (public.has_role(auth.uid(), 'nurse'));
CREATE POLICY "patient reads own vitals" ON public.vitals FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  value NUMERIC,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurses manage alerts" ON public.alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nurse')) WITH CHECK (public.has_role(auth.uid(), 'nurse'));
CREATE POLICY "patient reads own alerts" ON public.alerts FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

-- Alert thresholds per nurse
CREATE TABLE public.alert_thresholds (
  nurse_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hr_min INT NOT NULL DEFAULT 60,
  hr_max INT NOT NULL DEFAULT 100,
  spo2_min INT NOT NULL DEFAULT 94,
  temp_max NUMERIC NOT NULL DEFAULT 37.5,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_thresholds TO authenticated;
GRANT ALL ON public.alert_thresholds TO service_role;
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nurse own thresholds" ON public.alert_thresholds FOR ALL TO authenticated
  USING (auth.uid() = nurse_id) WITH CHECK (auth.uid() = nurse_id);
