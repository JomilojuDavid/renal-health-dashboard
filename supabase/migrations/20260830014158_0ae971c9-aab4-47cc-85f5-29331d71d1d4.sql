DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self or nurse read" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'nurse'));

CREATE POLICY "nurses read all roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'nurse'));