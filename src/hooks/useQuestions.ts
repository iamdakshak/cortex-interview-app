import { useEffect, useState } from "react";
import { dataSource } from "@/lib/dataSource";
import type { Question } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export function useQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await dataSource.listQuestions({ userId: user?.id ?? null, freshStart: user?.profile.freshStart });
      setQuestions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    }
  };

  useEffect(() => {
    refresh();

  }, [user?.id, user?.profile.freshStart]);

  return { questions, loading: questions === null, error, refresh };
}
