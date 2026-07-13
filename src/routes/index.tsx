import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Brain, Code2, Cpu, FileText, LineChart, MessageSquare,
  Mic, Sparkles, Target, Users, Zap,
} from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Prepr — AI Interview Coach that adapts to you" },
      { name: "description", content: "Practice technical, behavioral, coding, and system design interviews with an AI coach that tailors questions to your resume and target role." },
      { property: "og:title", content: "Prepr — AI Interview Coach that adapts to you" },
      { property: "og:description", content: "Rehearse behavioral, technical, coding, and system design interviews with an AI coach that grounds every question in your resume and target JD." },
      { property: "og:url", content: "https://my-ai-coach-buddy-92.lovable.app/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200" },
      { name: "twitter:title", content: "Prepr — AI Interview Coach that adapts to you" },
      { name: "twitter:description", content: "Rehearse behavioral, technical, coding, and system design interviews with an AI coach that grounds every question in your resume and target JD." },
      { name: "twitter:image", content: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200" },
    ],
    links: [
      { rel: "canonical", href: "https://my-ai-coach-buddy-92.lovable.app/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Prepr",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          description: "AI interview coach that tailors behavioral, technical, coding, and system design questions to your resume and target role, and grades every answer.",
          url: "https://my-ai-coach-buddy-92.lovable.app/",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
});


const interviewTypes = [
  { icon: Users, name: "Behavioral", desc: "STAR-format questions scored on communication, leadership, and clarity." },
  { icon: Brain, name: "Technical", desc: "Concept deep-dives, scenarios, and architecture questions per role." },
  { icon: Code2, name: "Coding", desc: "Live problems with correctness, complexity, and edge-case evaluation." },
  { icon: Cpu, name: "System Design", desc: "Scale, trade-offs, and architecture reviews with real-time feedback." },
  { icon: MessageSquare, name: "HR Screen", desc: "Motivation, culture-fit, and salary conversations rehearsed." },
  { icon: Sparkles, name: "AI Engineer", desc: "LLMs, embeddings, evals, and production ML system questions." },
];

const features = [
  { icon: FileText, title: "Resume-aware questions", desc: "Upload your PDF or DOCX resume. The coach mines skills, projects, and gaps to shape every session." },
  { icon: Target, title: "Job description matching", desc: "Paste any JD. Get a match score, missing skills, and a focused practice plan." },
  { icon: Zap, title: "Adaptive difficulty", desc: "The AI ramps up when you're strong and probes deeper when you're not." },
  { icon: LineChart, title: "Portfolio-grade reports", desc: "Downloadable PDF reports with scores, transcripts, and growth roadmaps." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-8 lg:py-32">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
              Adaptive AI interviews · Powered by Lovable AI
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Land the offer.<br />
              <span className="text-gradient">Rehearse with AI</span> first.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Practice technical, behavioral, coding, and system design interviews with a coach that reads your resume, matches your target role, and grades every answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 glow-ring"
              >
                Start free interview
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/40 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-card"
              >
                See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Mic className="h-4 w-4 text-primary" /> Voice or text</div>
              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Role-tailored</div>
              <div className="flex items-center gap-2"><LineChart className="h-4 w-4 text-primary" /> Weekly progress</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 blur-3xl opacity-60"
                 style={{ background: "var(--gradient-hero)" }} />
            <div className="surface-card overflow-hidden shadow-[var(--shadow-elev)]">
              <img src={heroImage} alt="Abstract neural conversation visualization representing AI-driven interview practice" className="w-full" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* Interview types */}
      <section id="interviews" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Ten interview modes. One coach.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pick your track. The AI adapts questions, difficulty, and evaluation rubric to match.
          </p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interviewTypes.map((t) => (
            <div key={t.name} className="surface-card group p-6 transition hover:border-primary/50">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Built for the way<br />hiring actually works.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Generic mock interviews don't cut it. Prepr grounds every question in your resume and the exact JD you're targeting — then grades you on the rubric real hiring panels use.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.title} className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">From resume to offer in four steps</h2>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {[
            { n: "01", t: "Upload resume", d: "PDF or DOCX. We extract skills, projects, and experience." },
            { n: "02", t: "Paste the JD", d: "See match score, missing skills, and a practice plan." },
            { n: "03", t: "Rehearse live", d: "Adaptive Q&A with follow-ups that mirror real panels." },
            { n: "04", t: "Get your report", d: "Downloadable PDF with scores, ideal answers, and next steps." },
          ].map((s) => (
            <div key={s.n} className="surface-card p-6">
              <div className="font-mono text-xs text-primary">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="surface-card relative overflow-hidden p-12 text-center">
          <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "var(--gradient-glow)" }} />
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Your next interview deserves better prep.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start a session in under a minute. No credit card. Free tier included.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 glow-ring"
          >
            Start free interview
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Prepr · Built on Lovable</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
