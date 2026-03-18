
-- Admin settings table for toggles like email invites
CREATE TABLE public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  send_invite_emails boolean NOT NULL DEFAULT true,
  org_name text NOT NULL DEFAULT 'Women In Business',
  org_email text NOT NULL DEFAULT 'ceo@womeninbusiness.org.za',
  monthly_price numeric NOT NULL DEFAULT 50,
  annual_price numeric NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read settings" ON public.admin_settings
  FOR SELECT TO authenticated USING (true);

-- Insert default row
INSERT INTO public.admin_settings (id) VALUES (1);

-- Payments table for tracking PayFast and offline payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  membership_id uuid REFERENCES public.memberships(id),
  amount numeric NOT NULL,
  transaction_fee numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'offline',
  payment_reference text,
  payfast_payment_id text,
  status text NOT NULL DEFAULT 'pending',
  plan text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
