
-- Update admin_settings with new columns and prices
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS charge_fee_to_client boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payfast_mode text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS payfast_merchant_id_live text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payfast_merchant_key_live text DEFAULT '';

UPDATE public.admin_settings SET monthly_price = 100, annual_price = 1000 WHERE id = 1;

-- Add proof of payment URL to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_of_payment_url text;

-- Create membership_claims table
CREATE TABLE public.membership_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  granted_until timestamp with time zone,
  membership_starts_at timestamp with time zone,
  membership_expires_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own claims"
  ON public.membership_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own claims"
  ON public.membership_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all claims"
  ON public.membership_claims FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_membership_claims_updated_at
  BEFORE UPDATE ON public.membership_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for proof of payment
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-of-payment', 'proof-of-payment', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload proof of payment"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proof-of-payment' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'proof-of-payment' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'proof-of-payment' AND public.has_role(auth.uid(), 'admin'));
