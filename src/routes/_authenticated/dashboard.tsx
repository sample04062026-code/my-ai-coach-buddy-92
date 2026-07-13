import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, FileText, LineChart, MessageCircle, Sparkles, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPES, listInterviewSessions } from "@/lib/interview.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · Prepr" },
      { name: "description", content: "Your interview prep dashboard: upload a resume, match a JD, and start a session." },
    ],
  }),
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const listFn = useServerFn(listInterviewSessions);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, headline, target_role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["interview_sessions", user.id],
    queryFn: () => listFn(),
  });

  const recentSessions = sessions?.slice(0, 5) ?? [];

  const displayName =
    profile?.full_name ??
    (user.user_metadata as { full_name?: string; name?: string } | null)?.full_name ??
    (user.user_metadata as { name?: string } | null)?.name ??
    user.email?.split("@")[0] ??
    "there";

  const quickActions = [
    { icon: FileText, title: "Upload resume", desc: "Extract skills and projects.", to: "/resume" as const },
    { icon: Target, title: "Match a JD", desc: "See your fit and gaps.", to: "/jd-match" as const },
    { icon: Sparkles, title: "Start interview", desc: "Behavioral, technical, or coding.", to: "/interview" as const },
    { icon: LineChart, title: "View progress", desc: "Scores and trends over time.", to: "/progress" as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-4xl font-bold tracking-tight">Hi, {displayName}.</h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.target_role
              ? `Let's get you ready for ${profile.target_role} interviews.`
              : "Set your target role to unlock tailored practice sessions."}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.title}
              to={a.to}
              className="surface-card group flex flex-col p-6 transition hover:border-primary/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
                <a.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-lg font-semibold">{a.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                Start <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-14 surface-card p-8">
          <h2 className="font-display text-xl font-semibold">Recent sessions</h2>
          <ul className="mt-4 divide-y divide-border/60">
            {recentSessions.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">
                You haven't run any interviews yet. Start your first session to see scores, transcripts, and feedback here.
              </li>
            )}
            {recentSessions.map((s) => {
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
                      <Badge variant="secondary" className="capitalize">
                        {typeLabel}
                      </Badge>
                      {s.status === "ended" && <Badge variant="outline">Ended</Badge>}
                      {typeof (s.score as { overall?: number } | null)?.overall === "number" && (
                        <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                          Score {(s.score as { overall: number }).overall}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
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
