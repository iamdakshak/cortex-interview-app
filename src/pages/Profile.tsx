import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { TOPICS } from "@/lib/dataSource";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [err, setErr] = useState<string | null>(null);

  if (!user) {
    return <p className="text-muted-foreground">Log in to view your profile.</p>;
  }

  const { profile } = user;

  const save = (patch: Parameters<typeof updateProfile>[0]) =>
    updateProfile(patch).catch((e) => setErr(e instanceof Error ? e.message : "Save failed"));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Role:</span>
            <Badge variant={profile.role === "admin" ? "default" : "secondary"} className="capitalize">
              {profile.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fresh start</CardTitle>
          <CardDescription>
            Hide the built-in seed bank. You'll only see your own questions and any shared ones from other users.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-md border p-3">
          <div className="text-sm">Hide seed bank</div>
          <Switch checked={profile.freshStart} onCheckedChange={(v) => save({ freshStart: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interests</CardTitle>
          <CardDescription>
            Drives the Daily pick and highlighted sections on the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const active = profile.interests.includes(t.slug);
            return (
              <button
                key={t.slug}
                onClick={() =>
                  save({
                    interests: active
                      ? profile.interests.filter((s) => s !== t.slug)
                      : [...profile.interests, t.slug],
                  })
                }
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

      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
