import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveInput = z.object({
  filePath: z.string().min(1).max(512),
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(120).optional(),
  rawText: z.string().min(20).max(200_000),
});

const STRUCTURE_PROMPT = `You extract structured resume data.
Return STRICT JSON matching this TypeScript type — no prose, no code fences:
{
  "summary": string,
  "headline": string,
  "years_experience": number | null,
  "skills": string[],
  "experience": { "company": string, "title": string, "start": string, "end": string, "highlights": string[] }[],
  "education": { "school": string, "degree": string, "field": string, "end": string }[],
  "projects": { "name": string, "description": string, "tech": string[] }[],
  "links": { "label": string, "url": string }[]
}
Unknown fields → empty string or empty array. Never invent data.`;

type ParsedResume = {
  summary: string;
  headline: string;
  years_experience: number | null;
  skills: string[];
  experience: { company: string; title: string; start: string; end: string; highlights: string[] }[];
  education: { school: string; degree: string; field: string; end: string }[];
  projects: { name: string; description: string; tech: string[] }[];
  links: { label: string; url: string }[];
};

async function structureWithAI(rawText: string): Promise<ParsedResume> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI Gateway key is not configured.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: STRUCTURE_PROMPT },
        { role: "user", content: rawText.slice(0, 60_000) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI Gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as Partial<ParsedResume>;

  return {
    summary: parsed.summary ?? "",
    headline: parsed.headline ?? "",
    years_experience: typeof parsed.years_experience === "number" ? parsed.years_experience : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s) => typeof s === "string") : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    links: Array.isArray(parsed.links) ? parsed.links : [],
  };
}

export const saveAndStructureResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Insert the row in "parsing" state so the UI can reflect progress on refresh.
    const { data: inserted, error: insErr } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        file_path: data.filePath,
        filename: data.filename,
        mime_type: data.mimeType ?? null,
        raw_text: data.rawText,
        status: "parsing",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 2. Structure with AI. On failure, mark the row failed but don't throw the row away.
    try {
      const parsed = await structureWithAI(data.rawText);
      const { error: upErr } = await supabase
        .from("resumes")
        .update({ parsed, status: "ready", error: null })
        .eq("id", inserted.id);
      if (upErr) throw new Error(upErr.message);

      // 3. Best-effort profile enrichment — never fatal to the upload flow.
      if (parsed.headline) {
        await supabase
          .from("profiles")
          .update({ headline: parsed.headline })
          .eq("id", userId);
      }

      return { resumeId: inserted.id, parsed };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("resumes")
        .update({ status: "failed", error: message })
        .eq("id", inserted.id);
      throw new Error(`Resume parsing failed: ${message}`);
    }
  });

export const getLatestResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("resumes")
      .select("id, filename, status, parsed, error, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
