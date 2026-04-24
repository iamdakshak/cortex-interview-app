import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
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

    const applySession = async (session: Session | null, { finishLoading }: { finishLoading: boolean }) => {
      try {
        if (session?.user) {
          const profile = await loadOrCreateProfile(session.user.id, session.user.email ?? "");
          if (!active) return;
          setUser({ id: session.user.id, email: session.user.email ?? "", profile });
        } else if (active) {
          setUser(null);
        }
      } catch (err) {
        // A profile load failure (e.g. RLS blocked, network blip) must not wedge
        // the app on the loading spinner — drop to signed-out and let the user retry.
        console.error("Failed to load profile", err);
        if (active) setUser(null);
      } finally {
        if (active && finishLoading) setLoading(false);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session, { finishLoading: true }))
      .catch((err) => {
        console.error("Failed to get session", err);
        if (active) setLoading(false);
      });

    // IMPORTANT: do not await supabase calls directly inside this callback —
    // the GoTrue client holds a lock while firing events, and awaiting another
    // supabase call here can deadlock (spinner hangs forever on reload).
    // Defer with setTimeout so the callback returns before we touch the client.
    // Also skip INITIAL_SESSION: getSession() above already handled it.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      setTimeout(() => {
        if (active) applySession(session, { finishLoading: false });
      }, 0);
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
