import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichContent } from "@/components/editor/RichContent";
import { EXTERNAL_SOURCES } from "@/lib/externalSources";
import { dataSource, TOPICS } from "@/lib/dataSource";
import { useAuth } from "@/contexts/AuthContext";
import type { Question } from "@/types";

export default function Explore() {
  const { isAdmin } = useAuth();
  const [results, setResults] = useState<Record<string, Question[] | "loading" | Error>>({});

  const load = async (id: string) => {
    const source = EXTERNAL_SOURCES.find((s) => s.id === id);
    if (!source) return;
    setResults((r) => ({ ...r, [id]: "loading" }));
    try {
      const data = await source.fetch();
      setResults((r) => ({ ...r, [id]: data }));
    } catch (e) {
      setResults((r) => ({ ...r, [id]: e instanceof Error ? e : new Error(String(e)) }));
    }
  };

  const importQuestion = async (q: Question) => {
    try {
      await dataSource.createQuestion({
        title: q.title,
        question: q.question,
        answer: q.answer,
        topicSlug: q.topicSlug,
        difficulty: q.difficulty,
        authorId: null,
        isPublic: true,
        tags: q.tags,
        sourceUrl: q.sourceUrl,
      });
      alert("Imported to the shared bank.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Explore external questions</h1>
        <p className="text-sm text-muted-foreground">
          Fetch curated interview Q&amp;A from public repos. Admins can import into the shared bank.
        </p>
      </div>

      {EXTERNAL_SOURCES.map((s) => {
        const topic = TOPICS.find((t) => t.slug === s.topicSlug);
        const state = results[s.id];
        return (
          <Card key={s.id}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {topic && <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: topic.color }} />}
                  {s.label}
                </CardTitle>
                <CardDescription>Topic: {topic?.name ?? s.topicSlug}</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => load(s.id)} disabled={state === "loading"}>
                {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {state === "loading" ? "Fetching…" : Array.isArray(state) ? "Refresh" : "Fetch"}
              </Button>
            </CardHeader>
            <CardContent>
              {state instanceof Error && <p className="text-sm text-destructive">{state.message}</p>}
              {Array.isArray(state) && (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">{state.length} questions</p>
                  <Accordion type="multiple" className="w-full">
                    {state.slice(0, 30).map((q) => (
                      <AccordionItem key={q.id} value={q.id}>
                        <AccordionTrigger>
                          <div className="flex flex-1 items-center gap-2 pr-3 text-left">
                            <Badge variant="secondary" className="shrink-0 capitalize">{q.difficulty}</Badge>
                            <span className="line-clamp-1">{q.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <RichContent html={q.answer} />
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {q.sourceUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={q.sourceUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Source
                                </a>
                              </Button>
                            )}
                            {isAdmin && (
                              <Button size="sm" onClick={() => importQuestion(q)}>
                                <Download className="h-3.5 w-3.5" /> Import to bank
                              </Button>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  {state.length > 30 && <p className="mt-2 text-xs text-muted-foreground">Showing first 30 of {state.length}.</p>}
                </>
              )}
              {!state && (
                <p className="text-sm text-muted-foreground">
                  Click <em>Fetch</em> to pull the latest questions from this repo.{" "}
                  <Link to="/" className="text-primary underline-offset-4 hover:underline">Or browse your bank →</Link>
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
