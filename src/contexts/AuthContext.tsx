import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, ADMIN_EMAIL, isSupabaseConfigured } from "@/lib/supabase";
import type { AuthUser, Profile, Role } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAnon: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "interests" | "freshStart">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        const profile = await loadOrCreateProfile(data.session.user.id, data.session.user.email ?? "");
        setUser({ id: data.session.user.id, email: data.session.user.email ?? "", profile });
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) {
        const profile = await loadOrCreateProfile(session.user.id, session.user.email ?? "");
        setUser({ id: session.user.id, email: session.user.email ?? "", profile });
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured. Add env vars and redeploy.");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured. Add env vars and redeploy.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const updateProfile: AuthContextValue["updateProfile"] = async (patch) => {
    if (!supabase || !user) return;
    const row: Record<string, unknown> = {};
    if (patch.interests !== undefined) row.interests = patch.interests;
    if (patch.freshStart !== undefined) row.fresh_start = patch.freshStart;
    const { data, error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    setUser({ ...user, profile: rowToProfile(data) });
  };

  const value: AuthContextValue = {
    user,
    loading,
    isAdmin: user?.profile.role === "admin",
    isAnon: !user,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const authConfigured = isSupabaseConfigured;

async function loadOrCreateProfile(userId: string, email: string): Promise<Profile> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (existing) return rowToProfile(existing);

  // First login — provision a profile row. Role is decided by env-configured admin email.
  const role: Role = email.toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email, role, interests: [], fresh_start: false })
    .select()
    .single();
  if (error) throw error;
  return rowToProfile(data);
}

interface ProfileRow {
  id: string;
  email: string;
  role: Role;
  interests: string[] | null;
  fresh_start: boolean;
  created_at: string;
}

function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    interests: r.interests ?? [],
    freshStart: r.fresh_start,
    createdAt: r.created_at,
  };
}
