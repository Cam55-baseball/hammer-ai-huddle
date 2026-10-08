ALTER TABLE public.consent_records DISABLE TRIGGER USER;
DELETE FROM public.consent_records WHERE user_id = '86bb0958-ea90-47de-abaa-4f64716e92ae' AND document_slug = 'minor-waiver' AND signer_name = 'Pat Tester';
ALTER TABLE public.consent_records ENABLE TRIGGER USER;