-- Attach handle_new_user trigger to create profile on signup
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update link_pending_member to also set the profile full_name from pending_members
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
    IF pending.plan = 'annual' THEN
      new_expires_at := pending.purchase_date + INTERVAL '1 year';
    ELSE
      new_expires_at := pending.purchase_date + INTERVAL '30 days';
    END IF;

    INSERT INTO public.memberships (user_id, plan, status, starts_at, expires_at)
    VALUES (NEW.id, pending.plan, 'active', pending.purchase_date, new_expires_at);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

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

-- Attach link_pending_member trigger (runs after profile creation)
CREATE TRIGGER on_auth_user_created_link_pending
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_member();