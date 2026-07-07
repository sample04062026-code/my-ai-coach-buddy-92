
CREATE TYPE public.resume_status AS ENUM ('uploaded', 'parsing', 'ready', 'failed');

CREATE TABLE public.resumes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  raw_text TEXT,
  parsed JSONB,
  status public.resume_status NOT NULL DEFAULT 'uploaded',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX resumes_user_id_idx ON public.resumes(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own resumes" ON public.resumes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own resumes" ON public.resumes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own resumes" ON public.resumes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own resumes" ON public.resumes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER resumes_set_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage: users can only touch objects under their own uid folder.
CREATE POLICY "Users read own resume files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own resume files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own resume files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own resume files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
