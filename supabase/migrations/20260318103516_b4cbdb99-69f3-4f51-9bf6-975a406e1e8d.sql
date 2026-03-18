-- Drop the existing ALL policy and recreate with explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can manage pending members" ON public.pending_members;

CREATE POLICY "Admins can manage pending members"
  ON public.pending_members
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));