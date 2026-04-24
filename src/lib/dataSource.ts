import seedQuestions from "@/data/seed-questions.json";
import topicsJson from "@/data/topics.json";
import type { Question, Topic } from "@/types";
import { supabase, isSupabaseConfigured } from "./supabase";

const SEED: Question[] = seedQuestions as Question[];
export const TOPICS: Topic[] = topicsJson as Topic[];

/**
 * Single data gateway used by the UI.
 *
 * In JSON-fallback mode (no Supabase env vars), writes fail loudly — the
 * seed bundle is read-only and signals to the user that they need to wire
 * up Supabase to persist anything.
 */
export const dataSource = {
  isRemote: isSupabaseConfigured,

  /**
   * List questions visible to the current viewer.
   *  - Seed questions are always included unless `freshStart` is true.
   *  - When signed in: user's own questions + all public questions by others.
   *  - When signed out (or no Supabase): just the seed.
   */
  async listQuestions(opts: { userId?: string | null; freshStart?: boolean } = {}): Promise<Question[]> {
    const { userId, freshStart } = opts;

    if (!supabase) {
      return freshStart ? [] : SEED;
    }

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const remote: Question[] = (data ?? []).map(rowToQuestion);
    const remoteAllowed = remote.filter((q) => q.isPublic || q.authorId === userId);
    return freshStart ? remoteAllowed.filter((q) => q.authorId === userId) : [...remoteAllowed, ...SEED];
  },

  async getQuestion(id: string): Promise<Question | null> {
    if (id.startsWith("seed-")) return SEED.find((q) => q.id === id) ?? null;
    if (!supabase) return null;
    const { data, error } = await supabase.from("questions").select("*").eq("id", id).single();
    if (error || !data) return null;
    return rowToQuestion(data);
  },

  async createQuestion(q: Omit<Question, "id" | "createdAt">): Promise<Question> {
    if (!supabase) throw new Error("Supabase not configured — cannot create questions in fallback mode.");
    const { data, error } = await supabase
      .from("questions")
      .insert({
        title: q.title,
        question: q.question,
        answer: q.answer,
        topic_slug: q.topicSlug,
        difficulty: q.difficulty,
        author_id: q.authorId,
        is_public: q.isPublic,
        tags: q.tags ?? [],
        source_url: q.sourceUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToQuestion(data);
  },

  async updateQuestion(id: string, patch: Partial<Question>): Promise<Question> {
    if (!supabase) throw new Error("Supabase not configured.");
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.question !== undefined) row.question = patch.question;
    if (patch.answer !== undefined) row.answer = patch.answer;
    if (patch.topicSlug !== undefined) row.topic_slug = patch.topicSlug;
    if (patch.difficulty !== undefined) row.difficulty = patch.difficulty;
    if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
    if (patch.tags !== undefined) row.tags = patch.tags;
    const { data, error } = await supabase.from("questions").update(row).eq("id", id).select().single();
    if (error) throw error;
    return rowToQuestion(data);
  },

  async deleteQuestion(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured.");
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) throw error;
  },

  topics(): Topic[] {
    return TOPICS;
  },
};

interface QuestionRow {
  id: string;
  title: string;
  question: string;
  answer: string;
  topic_slug: string;
  difficulty: Question["difficulty"];
  author_id: string | null;
  is_public: boolean;
  tags: string[] | null;
  source_url: string | null;
  created_at: string;
}

function rowToQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    title: r.title,
    question: r.question,
    answer: r.answer,
    topicSlug: r.topic_slug,
    difficulty: r.difficulty,
    authorId: r.author_id,
    isPublic: r.is_public,
    tags: r.tags ?? [],
    sourceUrl: r.source_url ?? undefined,
    createdAt: r.created_at,
  };
}
