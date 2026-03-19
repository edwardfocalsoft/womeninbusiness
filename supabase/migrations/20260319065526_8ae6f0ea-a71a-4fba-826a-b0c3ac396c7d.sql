
-- Add member_type and expires_at columns to pending_members
ALTER TABLE public.pending_members 
  ADD COLUMN IF NOT EXISTS member_type text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Add a comment for clarity
COMMENT ON COLUMN public.pending_members.member_type IS 'new, active, or expired';
