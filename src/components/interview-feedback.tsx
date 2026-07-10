import type { InterviewScoreResult } from "@/lib/interview-score.functions";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const RUBRIC_LABELS: Record<keyof InterviewScoreResult["rubric"], string> = {
  communication: "Communication",
  structure: "Structure",
  depth: "Depth",
  problem_solving: "Problem solving",
  role_fit: "Role fit",
};

function verdictTone(v: string) {
  switch (v) {
    case "strong":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "good":
      return "bg-primary/15 text-primary border-primary/30";
    case "weak":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }
}

export function InterviewFeedback({ result }: { result: InterviewScoreResult }) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Session score</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold">{result.overall}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <Badge variant="outline" className={`capitalize ${verdictTone(result.verdict)}`}>
              {result.verdict}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rubric
          </h3>
          <div className="mt-3 space-y-3">
            {(Object.keys(RUBRIC_LABELS) as (keyof typeof RUBRIC_LABELS)[]).map((k) => (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <span>{RUBRIC_LABELS[k]}</span>
                  <span className="tabular-nums text-muted-foreground">{result.rubric[k]}</span>
                </div>
                <Progress value={result.rubric[k]} className="mt-1 h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {result.summary && (
            <div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </h3>
              <p className="mt-2 text-sm leading-relaxed">{result.summary}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 border-t border-border/60 p-6 md:grid-cols-3">
        <FeedbackList title="Strengths" items={result.strengths} tone="text-emerald-400" />
        <FeedbackList title="Improvements" items={result.improvements} tone="text-amber-400" />
        <FeedbackList title="Next steps" items={result.next_steps} tone="text-primary" />
      </div>

      {result.notable_quotes.length > 0 && (
        <div className="border-t border-border/60 p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Notable quotes
          </h3>
          <ul className="mt-3 space-y-2">
            {result.notable_quotes.map((q, i) => (
              <li key={i} className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                "{q}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FeedbackList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <h3 className={`font-display text-sm font-semibold uppercase tracking-wider ${tone}`}>{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
