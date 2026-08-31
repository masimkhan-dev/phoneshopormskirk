CREATE OR REPLACE FUNCTION public.norm_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(COALESCE(_p,''), '[^0-9]', '', 'g')
$$;