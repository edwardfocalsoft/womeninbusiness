REVOKE EXECUTE ON FUNCTION public.get_event_rsvp_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_rsvp_count(uuid) TO authenticated;