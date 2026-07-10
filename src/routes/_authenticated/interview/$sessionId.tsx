import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Loader2, Send, Sparkles, StopCircle, Square } from "lucide-react";
import { toast } from "sonner";

import agentAvatar from "@/assets/agent-avatar.png";
import { supabase } from "@/integrations/supabase/client";
import { getInterviewSession, endInterviewSession, INTERVIEW_TYPES } from "@/lib/interview.functions";
import { scoreInterviewSession, type InterviewScoreResult } from "@/lib/interview-score.functions";
import { InterviewFeedback } from "@/components/interview-feedback";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/interview/$sessionId")({
  component: InterviewSessionPage,
  head: () => ({
    meta: [
      { title: "Interview · Prepr" },
      { name: "description", content: "Live AI mock interview with turn-by-turn feedback." },
    ],
  }),
});

function partsToText(parts: UIMessage["parts"]): string {
  return parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

function InterviewSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const getSessionFn = useServerFn(getInterviewSession);
  const endFn = useServerFn(endInterviewSession);

  const { data, isLoading, error } = useQuery({
    queryKey: ["interview_session", sessionId],
    queryFn: () => getSessionFn({ data: { id: sessionId } }),
  });

  const initialMessages: UIMessage[] = useMemo(() => {
    if (!data?.messages) return [];
    return data.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: "" }],
    }));
  }, [data?.messages]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-destructive">Could not load session.</p>
          <Link to="/interview" className="mt-4 inline-block text-sm text-primary">Back</Link>
        </main>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading session…
          </div>
        </main>
      </div>
    );
  }

  return (
    <ChatSurface
      sessionId={sessionId}
      title={data.session.title}
      type={data.session.type as string}
      status={data.session.status as string}
      initialMessages={initialMessages}
      initialFeedback={(data.session.feedback as unknown as InterviewScoreResult | null) ?? null}
      onEnd={async () => {
        await endFn({ data: { id: sessionId } });
        toast.success("Session ended");
        navigate({ to: "/interview" });
      }}
    />
  );
}

function ChatSurface({
  sessionId,
  title,
  type,
  status: sessionStatus,
  initialMessages,
  initialFeedback,
  onEnd,
}: {
  sessionId: string;
  title: string;
  type: string;
  status: string;
  initialMessages: UIMessage[];
  initialFeedback: InterviewScoreResult | null;
  onEnd: () => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<InterviewScoreResult | null>(initialFeedback);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const scoreFn = useServerFn(scoreInterviewSession);

  const scoreMutation = useMutation({
    mutationFn: () => scoreFn({ data: { id: sessionId } }),
    onSuccess: (r) => {
      setFeedback(r);
      qc.invalidateQueries({ queryKey: ["interview_session", sessionId] });
      qc.invalidateQueries({ queryKey: ["interview_sessions"] });
      toast.success("Feedback ready");
    },
    onError: (e) =>
      toast.error("Could not score session", {
        description: e instanceof Error ? e.message : "Try again.",
      }),
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId },
        fetch: (async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        }) as typeof fetch,
      }),
    [sessionId],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error("Chat error", { description: e.message }),
  });

  // Kick off the first question when opening an empty session.
  useEffect(() => {
    if (initialMessages.length === 0 && messages.length === 0 && status === "ready") {
      void sendMessage({ text: "Let's begin." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on updates.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Focus composer.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionStatus, sessionId]);

  const isBusy = status === "submitted" || status === "streaming";
  const disabled = isBusy || sessionStatus === "ended";
  const typeLabel = INTERVIEW_TYPES.find((t) => t.id === type)?.label ?? type;

  const submit = async () => {
    const text = input.trim();
    if (!text || disabled) return;
    setInput("");
    await sendMessage({ text });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/interview" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <img src={agentAvatar} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-semibold">{title}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="capitalize">{typeLabel}</Badge>
                {sessionStatus === "ended" && <Badge variant="outline">Ended</Badge>}
              </div>
            </div>
          </div>
          {sessionStatus !== "ended" && (
            <Button variant="outline" size="sm" onClick={onEnd}>
              <StopCircle className="mr-2 h-4 w-4" /> End session
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {status === "submitted" && <TypingIndicator />}
          {error && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-2 px-6 py-4">
          <Textarea
            ref={textareaRef}
            rows={2}
            placeholder={sessionStatus === "ended" ? "Session ended." : "Type your answer…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={sessionStatus === "ended"}
            className="min-h-[64px] resize-none"
          />
          {isBusy ? (
            <Button variant="outline" size="icon" onClick={() => stop()} aria-label="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={submit} disabled={disabled || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = partsToText(message.parts);
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground">
          <p className="whitespace-pre-wrap text-sm">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <img src={agentAvatar} alt="" width={32} height={32} className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
      <div className="prose prose-sm prose-invert max-w-none flex-1 [&_pre]:bg-muted/60 [&_pre]:p-3 [&_pre]:rounded-md [&_code]:text-primary">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <img src={agentAvatar} alt="" width={32} height={32} className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
      <div className="flex items-center gap-1 pt-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
      </div>
    </div>
  );
}
