import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings · Prepr" },
      { name: "description", content: "Update your profile, headline, and target role." },
    ],
  }),
});

const COMMON_ROLES = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full-Stack Engineer",
  "Mobile Engineer",
  "Data Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "Security Engineer",
  "Engineering Manager",
  "Product Manager",
  "Product Designer",
] as const;

const CUSTOM = "__custom__";

const ProfileSchema = z.object({
  full_name: z.string().trim().max(100, "Keep it under 100 characters."),
  headline: z.string().trim().max(160, "Keep it under 160 characters."),
  target_role: z.string().trim().max(100, "Keep it under 100 characters."),
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, headline, target_role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [rolePreset, setRolePreset] = useState<string>("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setHeadline(profile.headline ?? "");
    const role = profile.target_role ?? "";
    setTargetRole(role);
    setRolePreset(
      role === ""
        ? ""
        : (COMMON_ROLES as readonly string[]).includes(role)
          ? role
          : CUSTOM,
    );
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = ProfileSchema.parse({
        full_name: fullName,
        headline,
        target_role: targetRole,
      });
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: parsed.full_name || null,
        headline: parsed.headline || null,
        target_role: parsed.target_role || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile updated");
      navigate({ to: "/dashboard" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message : err instanceof Error ? err.message : "Failed to save";
      toast.error(msg ?? "Failed to save");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="text-4xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-2 text-muted-foreground">
            This shapes how Prepr greets you and tailors your interviews.
          </p>
        </div>

        <form
          className="mt-10 surface-card space-y-6 p-8"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              placeholder="Ada Lovelace"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={160}
              placeholder="Senior engineer focused on distributed systems"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">A short tagline for your profile.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_role_select">Target role</Label>
            <Select
              value={rolePreset}
              onValueChange={(v) => {
                setRolePreset(v);
                if (v !== CUSTOM) setTargetRole(v);
                else setTargetRole("");
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="target_role_select">
                <SelectValue placeholder="Pick a common role…" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Other / custom…</SelectItem>
              </SelectContent>
            </Select>
            {rolePreset === CUSTOM && (
              <Input
                className="mt-2"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                maxLength={100}
                placeholder="e.g. Developer Advocate"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || isLoading}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
