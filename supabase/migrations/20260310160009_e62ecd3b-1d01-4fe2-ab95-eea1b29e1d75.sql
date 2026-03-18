
-- Add FK from memberships to profiles via user_id for join queries
ALTER TABLE public.memberships
ADD CONSTRAINT memberships_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Allow admins to INSERT profiles (for adding members manually)
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to INSERT memberships
CREATE POLICY "Admins can insert memberships"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all memberships (update/delete)
CREATE POLICY "Admins can manage memberships"
ON public.memberships
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
