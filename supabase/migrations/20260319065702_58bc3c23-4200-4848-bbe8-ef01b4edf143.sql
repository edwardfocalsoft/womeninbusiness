
-- Update link_pending_member to use expires_at from pending_members when available
CREATE OR REPLACE FUNCTION public.link_pending_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending RECORD;
  new_expires_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO pending
  FROM public.pending_members
  WHERE email = NEW.email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Use explicit expires_at if set, otherwise calculate from plan
    IF pending.expires_at IS NOT NULL THEN
      new_expires_at := pending.expires_at;
    ELSIF pending.plan = 'annual' THEN
      new_expires_at := pending.purchase_date + INTERVAL '1 year';
    ELSE
      new_expires_at := pending.purchase_date + INTERVAL '30 days';
    END IF;

    -- Determine status based on member_type
    IF pending.member_type = 'expired' THEN
      -- Don't auto-create active membership for expired members
      -- They need to pay/renew first
      NULL;
    ELSE
      INSERT INTO public.memberships (user_id, plan, status, starts_at, expires_at)
      VALUES (NEW.id, pending.plan, 'active', pending.purchase_date, new_expires_at);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'member')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    UPDATE public.pending_members
    SET status = 'claimed'
    WHERE id = pending.id;

    -- Update profile full_name from pending member data
    UPDATE public.profiles
    SET full_name = pending.full_name
    WHERE user_id = NEW.id AND (full_name IS NULL OR full_name = '');
  END IF;

  RETURN NEW;
END;
$function$;
