-- Set shop contact email in business_settings
UPDATE public.business_settings
SET email = 'tefflakki188@gmail.com'
WHERE id IS NOT NULL;
