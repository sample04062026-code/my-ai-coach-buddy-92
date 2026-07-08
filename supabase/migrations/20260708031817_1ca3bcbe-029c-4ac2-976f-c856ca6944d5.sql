-- Session type enum
CREATE TYPE public.interview_type AS ENUM
  ('behavioral', 'technical', 'coding', 'system_design', 'hr', 'ai_engineer');

CREATE TYPE public.interview_status AS ENUM ('active', 'ended', 'abandoned');

CREATE TYPE public.message_role AS ENUM ('system', 'user', 'assistant');

-- Sessions
CREATE TABLE public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_match_id uuid references public.job_matches(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null,
  type public.interview_type not null,
  title text not null,
  status public.interview_status not null default 'active',
  config jsonb not null default '{}'::jsonb,
  score jsonb,
  feedback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.interview_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.interview_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.interview_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.interview_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER interview_sessions_set_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX interview_sessions_user_created_idx
  ON public.interview_sessions (user_id, created_at DESC);

-- Messages
CREATE TABLE public.interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.message_role not null,
  parts jsonb not null,
  token_usage jsonb,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_messages TO authenticated;
GRANT ALL ON public.interview_messages TO service_role;

ALTER TABLE public.interview_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages" ON public.interview_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.interview_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.interview_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX interview_messages_session_created_idx
  ON public.interview_messages (session_id, created_at ASC);