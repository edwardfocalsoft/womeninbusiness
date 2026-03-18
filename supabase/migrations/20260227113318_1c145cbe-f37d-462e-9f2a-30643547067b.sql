
-- Add member_id column to memberships table
ALTER TABLE public.memberships ADD COLUMN member_id TEXT UNIQUE;

-- Create function to generate unique 5-digit alphanumeric member ID
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  done BOOLEAN;
BEGIN
  done := FALSE;
  WHILE NOT done LOOP
    -- Generate 5-character alphanumeric ID (uppercase letters + digits)
    new_id := '';
    FOR i IN 1..5 LOOP
      IF random() < 0.5 THEN
        new_id := new_id || chr(65 + floor(random() * 26)::int);
      ELSE
        new_id := new_id || floor(random() * 10)::int::text;
      END IF;
    END LOOP;
    -- Check uniqueness
    done := NOT EXISTS (SELECT 1 FROM public.memberships WHERE member_id = new_id);
  END LOOP;
  NEW.member_id := new_id;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate member_id on insert
CREATE TRIGGER set_member_id
  BEFORE INSERT ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_member_id();

-- Backfill existing memberships with member IDs
DO $$
DECLARE
  rec RECORD;
  new_id TEXT;
  done BOOLEAN;
BEGIN
  FOR rec IN SELECT id FROM public.memberships WHERE member_id IS NULL LOOP
    done := FALSE;
    WHILE NOT done LOOP
      new_id := '';
      FOR i IN 1..5 LOOP
        IF random() < 0.5 THEN
          new_id := new_id || chr(65 + floor(random() * 26)::int);
        ELSE
          new_id := new_id || floor(random() * 10)::int::text;
        END IF;
      END LOOP;
      done := NOT EXISTS (SELECT 1 FROM public.memberships WHERE member_id = new_id);
    END LOOP;
    UPDATE public.memberships SET member_id = new_id WHERE id = rec.id;
  END LOOP;
END;
$$;
