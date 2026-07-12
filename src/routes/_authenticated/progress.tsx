import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, MessageCircle } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPES, listInterviewSessions } from "@/lib/interview.functions";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
  head: () => ({
    meta: [
      { title: "Progress · Prepr" },
      { name: "description", content: "Track your interview scores and trends over time." },
    ],
  }),
});

type Session = Awaited<ReturnType<typeof listInterviewSessions>>[number];

function overall(s: Session): number | null {
  const v = (s.score as { overall?: number } | null)?.overall;
  return typeof v === "number" ? v : null;
}

function ProgressPage() {
  const listFn = useServerFn(listInterviewSessions);
  const { user } = Route.useRouteContext();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["interview_sessions", user.id],
    queryFn: () => listFn(),
  });

  const scored = (sessions ?? []).filter((s) => overall(s) !== null);
  const scoredAsc = [...scored].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const trend = scoredAsc.map((s, i) => ({
    idx: i + 1,
    date: new Date(s.created_at).toLocaleDateString(),
    score: overall(s)!,
  }));

  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + (overall(s) ?? 0), 0) / scored.length)
      : 0;

  const byType = INTERVIEW_TYPES.map((t) => {
    const rows = scored.filter((s) => s.type === t.id);
    const a =
      rows.length > 0
        ? Math.round(rows.reduce((sum, s) => sum + (overall(s) ?? 0), 0) / rows.length)
        : null;
    return { id: t.id, label: t.label, avg: a, count: rows.length };
  }).filter((r) => r.count > 0);

  const recent = [...scored]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Your progress</p>
          <h1 className="text-4xl font-bold tracking-tight">Scores & trends</h1>
          <p className="mt-2 text-muted-foreground">
            Insights from every scored interview session.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-6">
            <p className="text-sm text-muted-foreground">Sessions completed</p>
            <p className="mt-2 font-display text-3xl font-semibold">{scored.length}</p>
          </div>
          <div className="surface-card p-6">
            <p className="text-sm text-muted-foreground">Average score</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {scored.length > 0 ? avg : "—"}
            </p>
          </div>
          <div className="surface-card p-6">
            <p className="text-sm text-muted-foreground">Latest score</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {scoredAsc.length > 0 ? scoredAsc[scoredAsc.length - 1].score ?? overall(scoredAsc[scoredAsc.length - 1]) : "—"}
            </p>
          </div>
        </div>

        <section className="mt-10 surface-card p-8">
          <h2 className="font-display text-xl font-semibold">Score trend</h2>
          <p className="text-sm text-muted-foreground">Overall score across sessions, oldest to newest.</p>
          <div className="mt-6 h-72 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No scored sessions yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="idx" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(_, p) => (p?.[0]?.payload as { date?: string })?.date ?? ""}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </RLineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="mt-10 surface-card p-8">
          <h2 className="font-display text-xl font-semibold">By interview type</h2>
          {byType.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No scored sessions yet.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {byType.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-4"
                >
                  <div>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.count} session{r.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                    Avg {r.avg}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 surface-card p-8">
          <h2 className="font-display text-xl font-semibold">Recent scored sessions</h2>
          <ul className="mt-4 divide-y divide-border/60">
            {recent.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">
                Score a session to see it here.
              </li>
            )}
            {recent.map((s) => {
              const typeLabel = INTERVIEW_TYPES.find((t) => t.id === s.type)?.label ?? s.type;
              const score = overall(s);
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <Link
                    to="/interview/$sessionId"
                    params={{ sessionId: s.id }}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{s.title}</span>
                      <Badge variant="secondary" className="capitalize">
                        {typeLabel}
                      </Badge>
                      {score !== null && (
                        <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                          Score {score}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                  </Link>
                  <Link to="/interview/$sessionId" params={{ sessionId: s.id }}>
                    <Button variant="ghost" size="icon" aria-label="Open">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
