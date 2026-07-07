import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FileText, Loader2, Upload, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { extractResumeText } from "@/lib/resume-parse";
import { saveAndStructureResume, getLatestResume } from "@/lib/resume.functions";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/resume")({
  component: ResumePage,
  head: () => ({
    meta: [
      { title: "Resume · Prepr" },
      { name: "description", content: "Upload your resume and let the AI coach extract your skills, experience, and projects." },
    ],
  }),
});

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

function ResumePage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const getLatest = useServerFn(getLatestResume);
  const saveFn = useServerFn(saveAndStructureResume);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: latest, isLoading } = useQuery({
    queryKey: ["resume", "latest", user.id],
    queryFn: () => getLatest(),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_SIZE) throw new Error("File too large — max 8MB.");

      setBusy("Reading file…");
      const rawText = await extractResumeText(file);
      if (rawText.length < 40) throw new Error("Could not read text from this file.");

      setBusy("Uploading…");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw new Error(upErr.message);

      setBusy("Structuring with AI…");
      return saveFn({
        data: {
          filePath: path,
          filename: file.name,
          mimeType: file.type || undefined,
          rawText,
        },
      });
    },
    onSuccess: () => {
      toast.success("Resume parsed", { description: "Skills and experience are ready." });
      queryClient.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: (err) => {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    },
    onSettled: () => setBusy(null),
  });

  const parsed = latest?.parsed as ParsedResumeShape | null | undefined;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Your resume</h1>
          <p className="text-muted-foreground">
            Upload a PDF or DOCX. We extract the text locally, then structure it with AI so every
            interview question is grounded in your real experience.
          </p>
        </div>

        {/* Upload dropzone */}
        <div
          className="mt-8 surface-card p-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) uploadMutation.mutate(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMutation.mutate(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary glow-ring">
              {uploadMutation.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>
            <p className="mt-4 font-display text-lg">
              {busy ?? "Drop your resume here"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX · up to 8MB</p>
            <Button
              className="mt-6"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Working…" : "Choose file"}
            </Button>
          </div>
        </div>

        {/* Latest resume */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Latest upload</h2>
          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !latest ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing uploaded yet.</p>
          ) : (
            <div className="mt-4 surface-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">{latest.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(latest.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <StatusBadge status={latest.status} />
              </div>

              {latest.status === "failed" && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{latest.error ?? "Parsing failed. Try re-uploading."}</span>
                </div>
              )}

              {parsed && latest.status === "ready" && (
                <div className="mt-6 space-y-6">
                  {parsed.headline && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Headline</div>
                      <div className="mt-1 font-display text-lg">{parsed.headline}</div>
                    </div>
                  )}
                  {parsed.summary && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Summary</div>
                      <p className="mt-1 text-sm text-muted-foreground">{parsed.summary}</p>
                    </div>
                  )}
                  {parsed.skills?.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Skills</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {parsed.skills.slice(0, 40).map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsed.experience?.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Experience</div>
                      <ul className="mt-2 space-y-3">
                        {parsed.experience.map((x, i) => (
                          <li key={i} className="rounded-md border border-border/50 p-3">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="font-medium">{x.title} · {x.company}</div>
                              <div className="text-xs text-muted-foreground">
                                {x.start} — {x.end || "Present"}
                              </div>
                            </div>
                            {x.highlights?.length > 0 && (
                              <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
                                {x.highlights.slice(0, 4).map((h, j) => <li key={j}>{h}</li>)}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ready. Head back to the dashboard to start an interview grounded in this resume.
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")
    return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>;
  if (status === "parsing")
    return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Parsing</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

type ParsedResumeShape = {
  summary: string;
  headline: string;
  years_experience: number | null;
  skills: string[];
  experience: { company: string; title: string; start: string; end: string; highlights: string[] }[];
  education: { school: string; degree: string; field: string; end: string }[];
  projects: { name: string; description: string; tech: string[] }[];
  links: { label: string; url: string }[];
};
