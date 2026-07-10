import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ id: z.string().uuid() });

const SYSTEM_PROMPT = `You are a rigorous interview coach grading a completed mock interview.
Analyze the transcript and return STRICT JSON — no prose, no fences — matching:
{
  "overall": number,                    // 0-100 overall performance
  "verdict": "strong" | "good" | "fair" | "weak",
  "summary": string,                    // 3-4 sentences, direct and honest
  "rubric": {                           // each 0-100
    "communication": number,
    "structure": number,                // STAR / requirements-first / clear framing
    "depth": number,                    // technical depth or specificity
    "problem_solving": number,
    "role_fit": number                  // fit vs target role/JD if provided
  },
  "strengths": string[],                // 3-5 concrete bullets citing what the candidate said
  "improvements": string[],             // 3-5 concrete, actionable bullets
  "next_steps": string[],               // 3-5 focused practice items
  "notable_quotes": string[]            // 0-3 short quotes from the candidate worth revisiting
}
Grade honestly. Never invent facts not present in the transcript.`;

type ScoreResult = {
  overall: number;
  verdict: string;
  summary: string;
  rubric: {
    communication: number;
    structure: number;
    depth: number;
    problem_solving: number;
    role_fit: number;
  };
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  notable_quotes: string[];
};

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export const scoreInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: session, error: sErr } = await supabase
      .from("interview_sessions")
      .select("id, type, title, config, resume_id, job_match_id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (sErr || !session) throw new Error("Session not found");

    const { data: messages, error: mErr } = await supabase
      .from("interview_messages")
      .select("role, parts, created_at")
      .eq("session_id", data.id)
      .neq("role", "system")
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const transcript = (messages ?? [])
      .map((m) => {
        const text = Array.isArray(m.parts)
          ? (m.parts as Array<{ type?: string; text?: string }>)
              .map((p) => (p?.type === "text" ? p.text ?? "" : ""))
              .join("")
          : "";
        return `${m.role.toUpperCase()}: ${text}`;
      })
      .join("\n\n")
      .slice(0, 24_000);

    if (!transcript.trim() || (messages ?? []).length < 2) {
      throw new Error("Not enough conversation to score yet.");
    }

    const [{ data: jd }] = await Promise.all([
      session.job_match_id
        ? supabase
            .from("job_matches")
            .select("job_title, company")
            .eq("id", session.job_match_id)
            .maybeSingle()
        : Promise.resolve({ data: null } as const),
    ]);

    const cfg = (session.config ?? {}) as { difficulty?: string; focus?: string | null };
    const contextBlock = JSON.stringify({
      session_type: session.type,
      title: session.title,
      difficulty: cfg.difficulty ?? "mid",
      focus: cfg.focus ?? null,
      target_role: jd?.job_title ?? null,
      target_company: jd?.company ?? null,
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI Gateway key is not configured.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Context:\n${contextBlock}\n\nTranscript:\n${transcript}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI is rate-limited right now. Please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI Gateway ${res.status}: ${body.slice(0, 300)}`);
    }

    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<ScoreResult> = {};
    try {
      parsed = JSON.parse(raw) as Partial<ScoreResult>;
    } catch {
      throw new Error("AI returned malformed JSON. Please retry.");
    }

    const rubric = (parsed.rubric ?? {}) as Partial<ScoreResult["rubric"]>;
    const result: ScoreResult = {
      overall: num(parsed.overall),
      verdict: typeof parsed.verdict === "string" ? parsed.verdict : "fair",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      rubric: {
        communication: num(rubric.communication),
        structure: num(rubric.structure),
        depth: num(rubric.depth),
        problem_solving: num(rubric.problem_solving),
        role_fit: num(rubric.role_fit),
      },
      strengths: arr(parsed.strengths),
      improvements: arr(parsed.improvements),
      next_steps: arr(parsed.next_steps),
      notable_quotes: arr(parsed.notable_quotes),
    };

    const { error: uErr } = await supabase
      .from("interview_sessions")
      .update({
        score: JSON.parse(JSON.stringify({ overall: result.overall, rubric: result.rubric, verdict: result.verdict })),
        feedback: JSON.parse(JSON.stringify(result)),
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);

    return result;
  });

export type InterviewScoreResult = ScoreResult;
