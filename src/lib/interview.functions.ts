import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INTERVIEW_TYPES = [
  { id: "behavioral", label: "Behavioral", desc: "STAR-format leadership and impact stories." },
  { id: "technical", label: "Technical", desc: "Fundamentals, trade-offs, and language depth." },
  { id: "coding", label: "Coding", desc: "Algorithmic problems, complexity, edge cases." },
  { id: "system_design", label: "System Design", desc: "Scale, storage, APIs, and reliability." },
  { id: "hr", label: "HR Screen", desc: "Motivation, culture-fit, comp expectations." },
  { id: "ai_engineer", label: "AI Engineer", desc: "LLMs, RAG, evals, and production ML." },
] as const;

export type InterviewTypeId = (typeof INTERVIEW_TYPES)[number]["id"];

const CreateInput = z.object({
  type: z.enum(["behavioral", "technical", "coding", "system_design", "hr", "ai_engineer"]),
  title: z.string().min(3).max(200),
  jobMatchId: z.string().uuid().nullable().optional(),
  difficulty: z.enum(["junior", "mid", "senior", "staff"]).default("mid"),
  focus: z.string().max(500).optional(),
});

export const createInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: resume } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: userId,
        type: data.type,
        title: data.title,
        job_match_id: data.jobMatchId ?? null,
        resume_id: resume?.id ?? null,
        config: { difficulty: data.difficulty, focus: data.focus ?? null },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const listInterviewSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("interview_sessions")
      .select("id, type, title, status, score, created_at, ended_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Session not found");

    const { data: messages, error: mErr } = await context.supabase
      .from("interview_messages")
      .select("id, role, parts, created_at")
      .eq("session_id", data.id)
      .neq("role", "system")
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    return { session, messages: messages ?? [] };
  });

export const deleteInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("interview_sessions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("interview_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
