import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Loader2,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import { analyzeJobMatch, listJobMatches, deleteJobMatch } from "@/lib/job-match.functions";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/jd-match")({
  component: JdMatchPage,
  head: () => ({
    meta: [
      { title: "JD Match · Prepr" },
      { name: "description", content: "Paste a job description and get an instant fit score, skill gaps, and a focused practice plan." },
    ],
  }),
});

type MatchResult = Awaited<ReturnType<typeof analyzeJobMatch>>;

function JdMatchPage() {
  const { user } = Route.useRouteContext();
  const analyzeFn = useServerFn(analyzeJobMatch);
  const listFn = useServerFn(listJobMatches);
  const deleteFn = useServerFn(deleteJobMatch);
  const queryClient = useQueryClient();

  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);

  const { data: history } = useQuery({
    queryKey: ["job_matches", user.id],
    queryFn: () => listFn(),
  });

  const analyze = useMutation({
    mutationFn: () =>
      analyzeFn({
        data: {
          jdText: jdText.trim(),
          jobTitle: jobTitle.trim() || undefined,
          company: company.trim() || undefined,
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["job_matches"] });
      toast.success("Match ready", { description: `Fit score: ${data.score}/100` });
      if (!data.hasResume) {
        toast.message("No resume on file", {
          description: "Upload one for a resume-grounded match.",
        });
      }
    },
    onError: (err) =>
      toast.error("Analysis failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job_matches"] }),
  });

  const canSubmit = jdText.trim().length >= 40 && !analyze.isPending;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Match a job description</h1>
          </div>
          <p className="text-muted-foreground">
            Paste a JD. We score your fit against your latest resume, surface missing skills, and generate a focused practice plan.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Input */}
          <section className="surface-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="job-title">Job title</Label>
                <Input
                  id="job-title"
                  placeholder="Senior Backend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-1.5">
              <Label htmlFor="jd">Job description</Label>
              <Textarea
                id="jd"
                rows={14}
                placeholder="Paste the full JD here…"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{jdText.length.toLocaleString()} characters</p>
            </div>
            <Button className="mt-4 w-full" onClick={() => analyze.mutate()} disabled={!canSubmit}>
              {analyze.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Analyze fit</>
              )}
            </Button>
          </section>

          {/* Result */}
          <section className="space-y-6">
            {result ? (
              <ResultPanel result={result} />
            ) : (
              <div className="surface-card flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary glow-ring">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mt-4 font-display text-lg">Your fit report will appear here</p>
                <p className="mt-1 text-sm text-muted-foreground">Paste a JD on the left to get started.</p>
              </div>
            )}

            {/* History */}
            {history && history.length > 0 && (
              <div className="surface-card p-6">
                <h2 className="font-display text-lg font-semibold">Recent matches</h2>
                <ul className="mt-3 divide-y divide-border/60">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {h.job_title || "Untitled role"}{h.company ? ` · ${h.company}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={h.score} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove.mutate(h.id)}
                          aria-label="Delete match"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ResultPanel({ result }: { result: MatchResult }) {
  return (
    <div className="surface-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall fit</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-gradient font-display text-5xl font-bold">{result.score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Badge className="mt-2 capitalize">{result.verdict}</Badge>
        </div>
        <div className="max-w-xs text-right text-sm text-muted-foreground">{result.summary}</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SkillList
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
          label="Matched skills"
          items={result.matched_skills}
          tone="primary"
        />
        <SkillList
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Missing skills"
          items={result.missing_skills}
          tone="destructive"
        />
      </div>

      {result.keyword_gaps.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">ATS keywords to add</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.keyword_gaps.map((k) => (
              <Badge key={k} variant="outline">{k}</Badge>
            ))}
          </div>
        </div>
      )}

      {(result.strengths.length > 0 || result.risks.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {result.strengths.length > 0 && (
            <BulletBlock label="Strengths" items={result.strengths} />
          )}
          {result.risks.length > 0 && (
            <BulletBlock label="Risks" items={result.risks} muted />
          )}
        </div>
      )}

      {result.practice_plan.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <div className="font-display text-lg font-semibold">Your practice plan</div>
          </div>
          <ol className="mt-3 space-y-3">
            {result.practice_plan.map((p, i) => (
              <li key={i} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{i + 1}. {p.focus}</div>
                  <Badge variant="secondary" className="capitalize">{p.type.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.why}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SkillList({
  icon,
  label,
  items,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  tone: "primary" | "destructive";
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-sm text-muted-foreground">None detected.</span>
        ) : (
          items.slice(0, 20).map((s) => (
            <Badge
              key={s}
              variant={tone === "destructive" ? "destructive" : "secondary"}
            >
              {s}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function BulletBlock({ label, items, muted }: { label: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <ul className={`mt-2 list-disc space-y-1 pl-4 text-sm ${muted ? "text-muted-foreground" : ""}`}>
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "default" : score >= 65 ? "secondary" : score >= 45 ? "outline" : "destructive";
  return <Badge variant={variant}>{score}</Badge>;
}
