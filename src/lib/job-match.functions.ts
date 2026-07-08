import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  jdText: z.string().min(40).max(30_000),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
});

const SYSTEM_PROMPT = `You are an expert technical recruiter and interview coach.
Compare a candidate resume (JSON) to a job description (plain text) and return STRICT JSON — no prose, no fences — matching:
{
  "score": number,                       // 0-100 overall fit
  "verdict": "strong" | "good" | "fair" | "weak",
  "summary": string,                     // 2-3 sentences
  "matched_skills": string[],            // skills present in BOTH
  "missing_skills": string[],            // required by JD, absent from resume
  "keyword_gaps": string[],              // ATS keywords worth adding
  "strengths": string[],                 // 3-5 bullets
  "risks": string[],                     // 3-5 bullets, honest gaps
  "practice_plan": {                     // exactly 5 focused items
    "focus": string,                     // topic to drill
    "why": string,                       // why it matters for THIS role
    "type": "behavioral" | "technical" | "coding" | "system_design" | "hr"
  }[]
}
Score honestly. Never invent resume facts.`;

type MatchResult = {
  score: number;
  verdict: string;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  keyword_gaps: string[];
  strengths: string[];
  risks: string[];
  practice_plan: { focus: string; why: string; type: string }[];
};

function coerceStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

async function callGateway(resumeJson: unknown, jdText: string, jobTitle?: string, company?: string): Promise<MatchResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI Gateway key is not configured.");

  const userMsg = JSON.stringify({
    job_title: jobTitle ?? null,
    company: company ?? null,
    job_description: jdText.slice(0, 20_000),
    resume: resumeJson ?? {},
  });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
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

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<MatchResult>;

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  const verdict = ["strong", "good", "fair", "weak"].includes(String(parsed.verdict))
    ? String(parsed.verdict)
    : score >= 80 ? "strong" : score >= 65 ? "good" : score >= 45 ? "fair" : "weak";

  const plan = Array.isArray(parsed.practice_plan)
    ? parsed.practice_plan
        .filter((p): p is { focus: string; why: string; type: string } =>
          !!p && typeof p.focus === "string" && typeof p.why === "string" && typeof p.type === "string",
        )
        .slice(0, 5)
    : [];

  return {
    score,
    verdict,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    matched_skills: coerceStringArray(parsed.matched_skills),
    missing_skills: coerceStringArray(parsed.missing_skills),
    keyword_gaps: coerceStringArray(parsed.keyword_gaps),
    strengths: coerceStringArray(parsed.strengths),
    risks: coerceStringArray(parsed.risks),
    practice_plan: plan,
  };
}

export const analyzeJobMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load latest ready resume (may be null — we still return a match against jd alone).
    const { data: resume } = await supabase
      .from("resumes")
      .select("id, parsed, status")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const result = await callGateway(resume?.parsed ?? null, data.jdText, data.jobTitle, data.company);

    const { data: inserted, error } = await supabase
      .from("job_matches")
      .insert({
        user_id: userId,
        resume_id: resume?.id ?? null,
        job_title: data.jobTitle ?? null,
        company: data.company ?? null,
        jd_text: data.jdText,
        score: result.score,
        verdict: result.verdict,
        summary: result.summary,
        matched_skills: result.matched_skills,
        missing_skills: result.missing_skills,
        keyword_gaps: result.keyword_gaps,
        strengths: result.strengths,
        risks: result.risks,
        practice_plan: result.practice_plan,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: inserted.id, ...result, hasResume: !!resume };
  });

export const listJobMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_matches")
      .select("id, job_title, company, score, verdict, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteJobMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("job_matches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
