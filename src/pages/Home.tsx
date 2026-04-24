import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, SlidersHorizontal, Sparkles, Pencil, ExternalLink, BookOpen, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichContent } from "@/components/editor/RichContent";
import { TOPICS } from "@/lib/dataSource";
import { useQuestions } from "@/hooks/useQuestions";
import { useAuth } from "@/contexts/AuthContext";
import type { Difficulty, Question } from "@/types";
import { cn } from "@/lib/utils";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const PAGE_SIZE = 20;

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hard: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default function Home() {
  const { questions, loading, error } = useQuestions();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  const filtered = useMemo(() => {
    if (!questions) return [];
    const q = query.toLowerCase().trim();
    return questions.filter((x) => {
      if (topic !== "all" && x.topicSlug !== topic) return false;
      if (difficulty !== "all" && x.difficulty !== difficulty) return false;
      if (!q) return true;
      return (
        x.title.toLowerCase().includes(q) ||
        x.question.toLowerCase().includes(q) ||
        x.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [questions, query, topic, difficulty]);

  const stats = useMemo(() => {
    if (!questions) return { total: 0, byDiff: { easy: 0, medium: 0, hard: 0 } };
    const byDiff = { easy: 0, medium: 0, hard: 0 } as Record<Difficulty, number>;
    for (const q of questions) byDiff[q.difficulty]++;
    return { total: questions.length, byDiff };
  }, [questions]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, topic, difficulty]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  return (
    <div className="flex flex-col gap-8">
      <Hero stats={stats} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 shrink-0 space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Topics
            </h3>
            <div className="flex flex-col gap-1">
              <TopicChip active={topic === "all"} onClick={() => setTopic("all")} color="#6366f1" label="All topics" />
              {TOPICS.map((t) => (
                <TopicChip
                  key={t.slug}
                  active={topic === t.slug}
                  color={t.color}
                  label={t.name}
                  onClick={() => setTopic(t.slug)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Difficulty
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={difficulty === "all" ? "default" : "outline"}
                onClick={() => setDifficulty("all")}
              >
                All
              </Button>
              {DIFFICULTIES.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={difficulty === d ? "default" : "outline"}
                  onClick={() => setDifficulty(d)}
                  className="capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search questions, content, tags…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-9 text-base"
              />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{filtered.length}</span>
              {filtered.length === 1 ? "result" : "results"}
            </div>
          </div>

          {error && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-5 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          {loading ? (
            <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <>
              <Accordion type="multiple" className="w-full space-y-3">
                {visible.map((q) => (
                  <QuestionAccordionItem key={q.id} q={q} />
                ))}
              </Accordion>

              {hasMore ? (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more questions…
                  <span className="text-xs tabular-nums">
                    {visible.length} / {filtered.length}
                  </span>
                </div>
              ) : filtered.length > PAGE_SIZE ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  You've reached the end — {filtered.length} questions
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Hero({ stats }: { stats: { total: number; byDiff: Record<Difficulty, number> } }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-fuchsia-500/10 p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            Keep your cortex sharp
          </div>
          <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Practice that builds muscle
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Real interview questions. No copy-paste shortcuts. Expand to read, think, then reveal — the goal is <em>your</em> brain, not AI autopilot.
          </p>
        </div>
        <div className="flex gap-3 text-xs sm:text-sm">
          <StatPill label="Questions" value={stats.total} tone="primary" />
          <StatPill label="Easy" value={stats.byDiff.easy} tone="emerald" />
          <StatPill label="Medium" value={stats.byDiff.medium} tone="amber" />
          <StatPill label="Hard" value={stats.byDiff.hard} tone="rose" />
        </div>
      </div>
    </section>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "primary" | "emerald" | "amber" | "rose" }) {
  const TONES = {
    primary: "text-primary",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
  };
  return (
    <div className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg border bg-card/60 px-3 py-2 backdrop-blur">
      <span className={cn("text-lg font-bold tabular-nums", TONES[tone])}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function TopicChip({ active, label, color, onClick }: { active: boolean; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground font-medium shadow-sm",
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full transition-transform", active && "scale-125")}
        style={{ background: color }}
      />
      <span>{label}</span>
    </button>
  );
}

function QuestionAccordionItem({ q }: { q: Question }) {
  const topic = TOPICS.find((t) => t.slug === q.topicSlug);
  const { isAdmin, user } = useAuth();
  const canEdit = (isAdmin || q.authorId === user?.id) && !q.id.startsWith("seed-");

  return (
    <AccordionItem
      value={q.id}
      className="group rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30 data-[state=open]:border-primary/40 data-[state=open]:shadow-md"
    >
      <AccordionTrigger className="gap-3 px-4 py-4 hover:no-underline sm:px-5">
        <div className="flex flex-1 flex-col gap-2 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            {topic && (
              <Badge variant="outline" className="gap-1 border-transparent bg-muted/60">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: topic.color }} />
                {topic.name}
              </Badge>
            )}
            <Badge variant="outline" className={cn("capitalize", DIFFICULTY_STYLES[q.difficulty])}>
              {q.difficulty}
            </Badge>
            {q.tags?.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="border-transparent bg-muted/60 text-muted-foreground">
                #{t}
              </Badge>
            ))}
            {!q.isPublic && <Badge variant="outline">Private</Badge>}
          </div>
          <div className="text-base font-semibold leading-snug text-foreground group-data-[state=open]:text-primary">
            {q.title}
          </div>
          <div
            className="line-clamp-2 text-sm text-muted-foreground group-data-[state=open]:hidden"
            dangerouslySetInnerHTML={{ __html: q.question }}
          />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-5 pt-0 sm:px-5">
        <div className="space-y-4 border-t pt-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              Question
            </div>
            <RichContent html={q.question} />
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" />
              Answer
            </div>
            <RichContent html={q.answer} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {q.sourceUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={q.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </a>
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/edit/${q.id}`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/30" />
      ))}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="rounded-full bg-muted p-3">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {query ? "No questions match your search" : "No questions yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {query ? "Try different keywords, or clear the filters." : "Import some from Explore, or add your own."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
