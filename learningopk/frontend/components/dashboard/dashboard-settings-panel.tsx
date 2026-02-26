"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { DashboardCard, DashboardSection } from "@/components/foundation/dashboard-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { applyTheme, type AppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type SettingsProfile = {
  name: string;
  studentClass: string;
  degree: string;
  board: string;
};

type DashboardSettingsPanelProps = {
  initialProfile: SettingsProfile;
};

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  studentClass: z.string().trim().min(1, "Please enter your class."),
  degree: z.string().trim().min(1, "Please enter your degree."),
  board: z.string().trim().min(1, "Please enter your board.")
});

export function DashboardSettingsPanel({ initialProfile }: DashboardSettingsPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppTheme>("light");

  const onProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      studentClass: String(formData.get("class") ?? ""),
      degree: String(formData.get("degree") ?? ""),
      board: String(formData.get("board") ?? "")
    });

    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? "Invalid profile input.");
      return;
    }

    setIsSavingProfile(true);
    const result = (await authClient.updateUser({
      name: parsed.data.name,
      class: parsed.data.studentClass,
      degree: parsed.data.degree,
      board: parsed.data.board
    })) as { error?: { message?: string } };
    setIsSavingProfile(false);

    if (result.error) {
      setProfileError(result.error.message ?? "Unable to update profile.");
      return;
    }

    pushToast({
      title: "Profile updated",
      description: "Your profile details were saved.",
      tone: "success"
    });
    router.refresh();
  };

  const onThemeChange = (nextTheme: AppTheme) => {
    applyTheme(nextTheme);
    setActiveTheme(nextTheme);
    pushToast({
      title: "Theme updated",
      description: `Switched to ${nextTheme} mode.`,
      tone: "info"
    });
  };

  return (
    <DashboardSection
      title="Settings"
      subtitle="Manage your profile details and display theme."
      contentClassName="grid gap-4 xl:grid-cols-2"
    >
      <DashboardCard className="p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-foreground">Profile management</h3>
        <p className="mt-1 text-sm text-muted-foreground">Update your name, class, degree, and board.</p>
        <form className="mt-4 space-y-3" onSubmit={onProfileSubmit} noValidate>
          <div className="space-y-1">
            <label htmlFor="settings-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input id="settings-name" name="name" defaultValue={initialProfile.name} autoComplete="name" />
          </div>

          <div className="space-y-1">
            <label htmlFor="settings-class" className="text-sm font-medium text-foreground">
              Class
            </label>
            <Input id="settings-class" name="class" defaultValue={initialProfile.studentClass} />
          </div>

          <div className="space-y-1">
            <label htmlFor="settings-degree" className="text-sm font-medium text-foreground">
              Degree
            </label>
            <Input id="settings-degree" name="degree" defaultValue={initialProfile.degree} />
          </div>

          <div className="space-y-1">
            <label htmlFor="settings-board" className="text-sm font-medium text-foreground">
              Board
            </label>
            <Input id="settings-board" name="board" defaultValue={initialProfile.board} />
          </div>

          {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}

          <Button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? "Saving profile..." : "Save profile"}
          </Button>
        </form>
      </DashboardCard>

      <DashboardCard className="p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-foreground">Theme</h3>
        <p className="mt-1 text-sm text-muted-foreground">Choose between light and dark interface themes.</p>
        <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Theme options">
          {(["light", "dark"] as const).map((theme) => {
            const isActive = activeTheme === theme;
            const label = theme === "light" ? "Light theme" : "Dark theme";

            return (
              <button
                key={theme}
                type="button"
                onClick={() => onThemeChange(theme)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </DashboardCard>
    </DashboardSection>
  );
}
