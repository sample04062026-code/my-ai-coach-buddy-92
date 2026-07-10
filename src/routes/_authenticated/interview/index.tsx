import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Loader2, MessageCircle, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  createInterviewSession,
  listInterviewSessions,
  deleteInterviewSession,
  INTERVIEW_TYPES,
  type InterviewTypeId,
} from "@/lib/interview.functions";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/interview/")({
  component: InterviewIndex,
  head: () => ({
    meta: [
      { title: "Interviews · Prepr" },
      { name: "description", content: "Start a mock interview or resume a previous session." },
    ],
  }),
});

const DIFFICULTIES = ["junior", "mid", "senior", "staff"] as const;

function InterviewIndex() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listInterviewSessions);
  const createFn = useServerFn(createInterviewSession);
  const deleteFn = useServerFn(deleteInterviewSession);

  const [type, setType] = useState<InterviewTypeId>("behavioral");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("mid");
  const [focus, setFocus] = useState("");

  const { data: sessions } = useQuery({
    queryKey: ["interview_sessions", user.id],
    queryFn: () => listFn(),
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          type,
          title: title.trim() || `${INTERVIEW_TYPES.find((t) => t.id === type)?.label} session`,
          difficulty,
          focus: focus.trim() || undefined,
        },
      }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["interview_sessions"] });
      navigate({ to: "/interview/$sessionId", params: { sessionId: id } });
    },
    onError: (e) =>
      toast.error("Could not start session", {
        description: e instanceof Error ? e.message : "Try again.",
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interview_sessions"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">Start a new mock, or resume a session.</p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* New session */}
          <section className="surface-card p-6">
            <h2 className="font-display text-xl font-semibold">Start a new session</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a type. Your latest resume auto-loads.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INTERVIEW_TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="s-title">Title (optional)</Label>
                <Input
                  id="s-title"
                  placeholder="e.g. Stripe SWE loop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="s-diff">Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as (typeof DIFFICULTIES)[number])}>
                  <SelectTrigger id="s-diff"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 grid gap-1.5">
              <Label htmlFor="s-focus">Focus area (optional)</Label>
              <Input
                id="s-focus"
                placeholder="e.g. distributed systems, negotiation, leetcode-mediums"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
            </div>

            <Button className="mt-6 w-full" onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Start interview</>
              )}
            </Button>
          </section>

          {/* Recent sessions */}
          <section className="surface-card p-6">
            <h2 className="font-display text-xl font-semibold">Your sessions</h2>
            <ul className="mt-4 divide-y divide-border/60">
              {(!sessions || sessions.length === 0) && (
                <li className="py-6 text-sm text-muted-foreground">Nothing yet — start your first mock on the left.</li>
              )}
              {sessions?.map((s) => {
                const typeLabel = INTERVIEW_TYPES.find((t) => t.id === s.type)?.label ?? s.type;
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
                        <Badge variant="secondary" className="capitalize">{typeLabel}</Badge>
                        {s.status === "ended" && <Badge variant="outline">Ended</Badge>}
                        {typeof (s.score as { overall?: number } | null)?.overall === "number" && (
                          <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                            Score {(s.score as { overall: number }).overall}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
        </div>
      </main>
    </div>
  );
}
