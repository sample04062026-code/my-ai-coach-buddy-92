import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary glow-ring">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Prepr</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">Features</a>
          <a href="#interviews" className="text-sm text-muted-foreground transition hover:text-foreground">Interviews</a>
          <a href="#how" className="text-sm text-muted-foreground transition hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-block">Sign in</Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
