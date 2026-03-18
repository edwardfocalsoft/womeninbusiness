
-- Create pending_members table for admin-added members who haven't signed up yet
CREATE TABLE public.pending_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  plan public.membership_plan NOT NULL,
  purchase_date timestamp with time zone NOT NULL,
  added_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pending members"
ON public.pending_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop the FK we added last time since it won't work with pending members
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_profiles_fkey;
