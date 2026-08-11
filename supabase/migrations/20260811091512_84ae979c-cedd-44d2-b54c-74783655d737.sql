CREATE POLICY "user_roles self claim once" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
);
GRANT INSERT ON public.user_roles TO authenticated;