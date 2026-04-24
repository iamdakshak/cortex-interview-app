export type Role = "admin" | "user";
export type Difficulty = "easy" | "medium" | "hard";

export interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface Question {
  id: string;
  title: string;
  /** HTML string, rendered via sanitized dangerouslySetInnerHTML. */
  question: string;
  /** HTML string, rendered via sanitized dangerouslySetInnerHTML. */
  answer: string;
  topicSlug: string;
  difficulty: Difficulty;
  /** null when the question is from the shared bank / seed. */
  authorId: string | null;
  /** true when user has marked this question as visible to everyone. */
  isPublic: boolean;
  createdAt: string;
  /** Optional tags beyond primary topic. */
  tags?: string[];
  /** Source URL if fetched from an external repo. */
  sourceUrl?: string;
}

export interface Profile {
  id: string;
  email: string;
  role: Role;
  /** Topic slugs the user has marked as interests. */
  interests: string[];
  /** If true, the user only sees their own questions + shared public, not the seed. */
  freshStart: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}
