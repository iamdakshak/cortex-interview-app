import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichContent } from "@/components/editor/RichContent";
import { useQuestions } from "@/hooks/useQuestions";
import { useAuth } from "@/contexts/AuthContext";
import { TOPICS } from "@/lib/dataSource";
import { hashString, todayKey } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Difficulty, Question } from "@/types";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hard: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default function Daily() {
  const { questions, loading } = useQuestions();
  const { user } = useAuth();
  const interests = user?.profile.interests ?? [];

  const dailyPick = useMemo(() => {
    if (!questions || questions.length === 0) return null;
    const pool = interests.length
      ? questions.filter((q) => interests.includes(q.topicSlug))
      : questions;
    const effective = pool.length > 0 ? pool : questions;
    const seed = hashString(todayKey() + (user?.id ?? "anon"));
    return effective[seed % effective.length];
  }, [questions, interests, user?.id]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-fuchsia-500/10 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 p-2 text-primary-foreground shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Question of the Day</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A fresh problem every day, drawn from your interests. Try to answer before revealing.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
      ) : dailyPick ? (
        <DailyCard q={dailyPick} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No questions available yet.{" "}
            <Link className="text-primary underline" to="/explore">Import some from Explore →</Link>
          </CardContent>
        </Card>
      )}

      <InterestPicker />
    </div>
  );
}

function DailyCard({ q }: { q: Question }) {
  const topic = TOPICS.find((t) => t.slug === q.topicSlug);
  return (
    <Card className="shadow-sm">
      <CardHeader>
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
        </div>
        <CardTitle className="pt-1 text-xl">{q.title}</CardTitle>
        <CardDescription>Today's pick — try to answer before expanding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RichContent html={q.question} />
        <Accordion type="single" collapsible>
          <AccordionItem
            value="a"
            className="rounded-lg border border-primary/20 bg-primary/5 px-4 transition-colors data-[state=open]:border-primary/40"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Reveal answer
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <RichContent html={q.answer} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function InterestPicker() {
  const { user, updateProfile } = useAuth();
  if (!user) return null;
  const interests = user.profile.interests;

  const toggle = (slug: string) => {
    const next = interests.includes(slug) ? interests.filter((x) => x !== slug) : [...interests, slug];
    updateProfile({ interests: next }).catch(() => alert("Failed to save interests"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your interests</CardTitle>
        <CardDescription>Daily picks are drawn from these topics.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {TOPICS.map((t) => {
          const active = interests.includes(t.slug);
          return (
            <button
              key={t.slug}
              onClick={() => toggle(t.slug)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors " +
                (active ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent")
              }
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
              {t.name}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
