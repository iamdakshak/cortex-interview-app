import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichEditor } from "@/components/editor/Editor";
import { dataSource, TOPICS } from "@/lib/dataSource";
import { useAuth } from "@/contexts/AuthContext";
import type { Difficulty, Question } from "@/types";

export default function QuestionEdit() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const nav = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [questionHtml, setQuestionHtml] = useState("");
  const [answerHtml, setAnswerHtml] = useState("");
  const [topicSlug, setTopicSlug] = useState<string>(TOPICS[0]?.slug ?? "javascript");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    dataSource.getQuestion(id).then((q) => {
      if (!q) return;
      setTitle(q.title);
      setQuestionHtml(q.question);
      setAnswerHtml(q.answer);
      setTopicSlug(q.topicSlug);
      setDifficulty(q.difficulty);
      setTags((q.tags ?? []).join(", "));
      setIsPublic(q.isPublic);
    });
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const payload = {
      title: title.trim(),
      question: questionHtml,
      answer: answerHtml,
      topicSlug,
      difficulty,
      authorId: user?.id ?? null,
      isPublic,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editing && id) {
        await dataSource.updateQuestion(id, payload);
      } else {
        await dataSource.createQuestion(payload as Omit<Question, "id" | "createdAt">);
      }
      nav("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mx-auto max-w-3xl space-y-5" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit question" : "New question"}</CardTitle>
          <CardDescription>Rich text supported. Paste code and it'll become a syntax-highlighted block.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Explain hoisting in JavaScript" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Select value={topicSlug} onValueChange={setTopicSlug}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="hooks, performance" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Question</Label>
            <RichEditor value={questionHtml} onChange={setQuestionHtml} placeholder="Describe the problem…" />
          </div>

          <div className="space-y-1.5">
            <Label>Answer</Label>
            <RichEditor value={answerHtml} onChange={setAnswerHtml} placeholder="Explain the answer. Paste code samples — they'll auto-format." />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Share publicly</p>
              <p className="text-xs text-muted-foreground">Make this question visible to every signed-in user.</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => nav(-1)}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create"}</Button>
      </div>
    </form>
  );
}
