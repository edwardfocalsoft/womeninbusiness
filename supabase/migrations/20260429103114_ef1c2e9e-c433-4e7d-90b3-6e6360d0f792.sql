-- Compliance records table
CREATE TABLE public.compliance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cipc_registered BOOLEAN,
  sars_registered BOOLEAN,
  bee_affidavit BOOLEAN,
  csd_registered BOOLEAN,
  has_website BOOLEAN,
  has_bank_account BOOLEAN,
  is_operational BOOLEAN,
  uif_registered BOOLEAN,
  paye_registered BOOLEAN,
  coida_registered BOOLEAN,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance"
  ON public.compliance_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compliance"
  ON public.compliance_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compliance"
  ON public.compliance_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage compliance"
  ON public.compliance_records FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_compliance_records_updated_at
  BEFORE UPDATE ON public.compliance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add a payment status to RSVPs to support paid events
ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Allow members to view RSVP counts for capacity (count only - via aggregate). 
-- Existing select policy for users to view own rsvps is enough; admin sees all.
-- For capacity check, we'll use a view-friendly count query as authenticated user
-- via a security-definer function.

CREATE OR REPLACE FUNCTION public.get_event_rsvp_count(_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.rsvps
  WHERE event_id = _event_id AND status = 'confirmed' AND payment_status IN ('free', 'paid');
$$;