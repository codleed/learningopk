"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { DashboardSection } from "@/components/foundation/dashboard-primitives";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { uploadProfileImage } from "@/lib/profile-api";
import { applyTheme, type AppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type SettingsProfile = {
  name: string;
  image: string | null;
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
  board: z.string().trim().min(1, "Please enter your board."),
});

export function DashboardSettingsPanel({ initialProfile }: DashboardSettingsPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileImageError, setProfileImageError] = useState<string | null>(null);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(initialProfile.image);
  const [activeTheme, setActiveTheme] = useState<AppTheme>("light");
  const avatarInitials = useMemo(
    () =>
      initialProfile.name
        .split(" ")
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join(""),
    [initialProfile.name]
  );

  useEffect(() => {
    return () => {
      if (previewImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const onProfileImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setProfileImageError(null);
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimeTypes.includes(file.type)) {
      setProfileImageError("Only JPEG, PNG, WEBP, and GIF files are allowed.");
      event.currentTarget.value = "";
      return;
    }

    const maxFileSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      setProfileImageError("Profile image must be smaller than 2MB.");
      event.currentTarget.value = "";
      return;
    }

    if (previewImageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewImageUrl);
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setSelectedProfileImage(file);
    setPreviewImageUrl(localPreviewUrl);
  };

  const onProfileImageUpload = async () => {
    if (!selectedProfileImage) {
      setProfileImageError("Choose an image before uploading.");
      return;
    }

    setIsUploadingProfileImage(true);
    setProfileImageError(null);

    try {
      const payload = await uploadProfileImage(selectedProfileImage);
      if (previewImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewImageUrl);
      }
      setPreviewImageUrl(payload.imageUrl);
      setSelectedProfileImage(null);
      pushToast({
        title: "Profile picture updated",
        description: "Your new profile image was uploaded successfully.",
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload profile picture.";
      setProfileImageError(message);
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const onProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      studentClass: String(formData.get("class") ?? ""),
      degree: String(formData.get("degree") ?? ""),
      board: String(formData.get("board") ?? ""),
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
      board: parsed.data.board,
    })) as { error?: { message?: string } };
    setIsSavingProfile(false);

    if (result.error) {
      setProfileError(result.error.message ?? "Unable to update profile.");
      return;
    }

    pushToast({
      title: "Profile updated",
      description: "Your profile details were saved.",
      tone: "success",
    });
    router.refresh();
  };

  const onThemeChange = (nextTheme: AppTheme) => {
    applyTheme(nextTheme);
    setActiveTheme(nextTheme);
    pushToast({
      title: "Theme updated",
      description: `Switched to ${nextTheme} mode.`,
      tone: "info",
    });
  };

  return (
    <div className="bg-bg-base">
      <DashboardSection
        title="Settings"
        subtitle="Manage your profile details and display theme."
        contentClassName="grid gap-4 xl:grid-cols-2"
      >
        <div className="rounded-[1.8rem] border border-border-default bg-bg-surface px-4 py-5 sm:px-6 sm:py-7">
          <h3 className="font-heading text-xl font-extrabold tracking-[-0.04em] text-text-primary">
            Profile management
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Update your photo, name, class, degree, and board.
          </p>

          <div className="mt-5 rounded-[1.2rem] border border-border-default bg-bg-surface p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border-default bg-bg-subtle text-sm font-semibold text-text-secondary">
                {previewImageUrl ? (
                  <Image
                    src={previewImageUrl}
                    alt="Profile preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span>{avatarInitials || "U"}</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label
                  htmlFor="settings-profile-image"
                  className="text-sm font-bold tracking-[-0.02em] text-text-primary"
                >
                  Profile picture
                </label>
                <input
                  id="settings-profile-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onProfileImageSelect}
                  className="flex h-9 w-full text-xs text-text-secondary file:mr-3 file:inline-flex file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-bg-surface file:text-sm file:font-semibold file:text-text-primary hover:file:bg-bg-subtle transition-colors cursor-pointer"
                />
                <button
                  type="button"
                  onClick={onProfileImageUpload}
                  disabled={isUploadingProfileImage || !selectedProfileImage}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border-default bg-bg-surface px-4 text-sm font-semibold text-text-primary transition-all duration-200 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingProfileImage ? "Uploading..." : "Upload picture"}
                </button>
              </div>
            </div>
            {profileImageError ? (
              <p className="mt-2 text-sm font-medium text-accent-danger">{profileImageError}</p>
            ) : null}
          </div>

          <form className="mt-5 space-y-4" onSubmit={onProfileSubmit} noValidate>
            <div className="space-y-2">
              <label
                htmlFor="settings-name"
                className="text-sm font-bold tracking-[-0.02em] text-text-primary"
              >
                Name
              </label>
              <input
                id="settings-name"
                name="name"
                defaultValue={initialProfile.name}
                autoComplete="name"
                className="flex h-11 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-class"
                className="text-sm font-bold tracking-[-0.02em] text-text-primary"
              >
                Class
              </label>
              <input
                id="settings-class"
                name="class"
                defaultValue={initialProfile.studentClass}
                className="flex h-11 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-degree"
                className="text-sm font-bold tracking-[-0.02em] text-text-primary"
              >
                Degree
              </label>
              <input
                id="settings-degree"
                name="degree"
                defaultValue={initialProfile.degree}
                className="flex h-11 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-board"
                className="text-sm font-bold tracking-[-0.02em] text-text-primary"
              >
                Board
              </label>
              <input
                id="settings-board"
                name="board"
                defaultValue={initialProfile.board}
                className="flex h-11 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all duration-200"
              />
            </div>

            {profileError ? (
              <p className="text-sm font-medium text-accent-danger">{profileError}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] font-bold text-[var(--primary-foreground)] transition-all duration-200 hover:bg-[var(--primary-hover)] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto sm:px-8"
            >
              {isSavingProfile ? "Saving profile..." : "Save profile"}
            </button>
          </form>
        </div>

        <div className="rounded-[1.8rem] border border-border-default bg-bg-surface px-4 py-5 sm:px-6 sm:py-7">
          <h3 className="font-heading text-xl font-extrabold tracking-[-0.04em] text-text-primary">
            Theme
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Choose between light and dark interface themes.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Theme options">
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
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-text-primary shadow-md"
                      : "border-border-default bg-bg-surface text-text-secondary hover:border-[var(--primary)]/50"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}
