
CREATE OR REPLACE FUNCTION public.link_pending_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pending RECORD;
  new_expires_at TIMESTAMPTZ;
BEGIN
  -- Check if this new user's email matches a pending member
  SELECT * INTO pending
  FROM public.pending_members
  WHERE email = NEW.email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Calculate expiry based on plan and purchase_date
    IF pending.plan = 'annual' THEN
      new_expires_at := pending.purchase_date + INTERVAL '1 year';
    ELSE
      new_expires_at := pending.purchase_date + INTERVAL '30 days';
    END IF;

    -- Create membership for the new user
    INSERT INTO public.memberships (user_id, plan, status, starts_at, expires_at)
    VALUES (NEW.id, pending.plan, 'active', pending.purchase_date, new_expires_at);

    -- Add member role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Mark pending member as claimed
    UPDATE public.pending_members
    SET status = 'claimed'
    WHERE id = pending.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (fires after insert, i.e. after signup)
CREATE TRIGGER on_user_created_link_pending
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_member();
