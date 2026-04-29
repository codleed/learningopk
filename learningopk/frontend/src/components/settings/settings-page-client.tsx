"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Camera,
  Flame,
  Globe,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  MessageSquare,
  Palette,
  Shield,
  Trash2,
  Trophy,
  Upload,
  User,
  UserCircle,
} from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { RadixSelect, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabContent, TabList, TabTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { updateLeaderboardSettings, type LeaderboardSettings } from "@/lib/leaderboard-api";
import { uploadProfileImage } from "@/lib/profile-api";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

type SettingsProfile = {
  name: string;
  email: string;
  image: string | null;
  studentClass: string;
  degree: string;
  board: string;
  leaderboard: LeaderboardSettings;
};

type SettingsPageClientProps = {
  initialProfile: SettingsProfile;
};

/* ─── Validation schemas ─── */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  bio: z.string().max(300, "Bio cannot exceed 300 characters.").optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Please enter your current password."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/* ─── Constants ─── */

const BOARDS = [
  { value: "federal", label: "Federal Board (FBISE)" },
  { value: "punjab", label: "Punjab Board" },
  { value: "sindh", label: "Sindh Board" },
  { value: "kpk", label: "KPK Board" },
  { value: "balochistan", label: "Balochistan Board" },
  { value: "ajk", label: "AJK Board" },
  { value: "cambridge", label: "Cambridge (O/A Levels)" },
];

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Urdu",
  "Computer Science",
  "Pakistan Studies",
  "Islamiat",
];

const NOTIFICATION_SETTINGS = [
  {
    id: "quiz-reminders",
    label: "Quiz reminders",
    description: "Get reminded about pending quizzes and practice sessions",
    icon: BellRing,
  },
  {
    id: "forum-replies",
    label: "Forum reply notifications",
    description: "Receive alerts when someone replies to your posts",
    icon: MessageSquare,
  },
  {
    id: "streak-alerts",
    label: "Streak alerts",
    description: "Stay notified about your study streak status",
    icon: Flame,
  },
  {
    id: "weekly-summary",
    label: "Weekly summary email",
    description: "Get a weekly digest of your progress and achievements",
    icon: MailCheck,
  },
];

/* ─── Tab config ─── */

const TAB_ITEMS = [
  { value: "profile", label: "Profile", icon: UserCircle },
  { value: "preferences", label: "Preferences", icon: Palette },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "account", label: "Account", icon: Shield },
] as const;

/* ─── Animation variants ─── */

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

/* ═══════════════════════════════════════════
   Main Settings Page Client
   ═══════════════════════════════════════════ */

export function SettingsPageClient({ initialProfile }: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        stickyClassName="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
        title="Settings"
        subtitle="Manage your profile, preferences, and account settings."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* ── Tab navigation ── */}
        <TabList variant="pills" className="flex-wrap">
          {TAB_ITEMS.map((tab) => (
            <TabTrigger
              key={tab.value}
              value={tab.value}
              variant="pills"
              layoutId="settings-tab-indicator"
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabTrigger>
          ))}
        </TabList>

        {/* ── Tab panels ── */}
        <TabContent value="profile" className="mt-6">
          <motion.div key="profile" variants={fadeIn} initial="hidden" animate="visible">
            <ProfileTab initialProfile={initialProfile} />
          </motion.div>
        </TabContent>

        <TabContent value="preferences" className="mt-6">
          <motion.div key="preferences" variants={fadeIn} initial="hidden" animate="visible">
            <PreferencesTab initialBoard={initialProfile.board} />
          </motion.div>
        </TabContent>

        <TabContent value="notifications" className="mt-6">
          <motion.div key="notifications" variants={fadeIn} initial="hidden" animate="visible">
            <NotificationsTab initialLeaderboard={initialProfile.leaderboard} />
          </motion.div>
        </TabContent>

        <TabContent value="account" className="mt-6">
          <motion.div key="account" variants={fadeIn} initial="hidden" animate="visible">
            <AccountTab email={initialProfile.email} />
          </motion.div>
        </TabContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Profile Tab
   ═══════════════════════════════════════════ */

function ProfileTab({ initialProfile }: { initialProfile: SettingsProfile }) {
  const router = useRouter();
  const { pushToast } = useToast();

  /* Profile form state */
  const [name, setName] = useState(initialProfile.name);
  const [bio, setBio] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  /* Image upload state */
  const [profileImageError, setProfileImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialProfile.image);

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

  /* Cleanup blob URLs */
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* Image selection handler */
  const onImageSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setProfileImageError(null);
      const file = event.currentTarget.files?.[0];
      if (!file) return;

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedMimeTypes.includes(file.type)) {
        setProfileImageError(
          "Only JPEG, PNG, WEBP, and GIF files are allowed."
        );
        event.currentTarget.value = "";
        return;
      }

      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        setProfileImageError("Profile image must be smaller than 2MB.");
        event.currentTarget.value = "";
        return;
      }

      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [previewUrl]
  );

  /* Image upload handler */
  const onImageUpload = useCallback(async () => {
    if (!selectedFile) {
      setProfileImageError("Choose an image before uploading.");
      return;
    }

    setIsUploadingImage(true);
    setProfileImageError(null);

    try {
      const payload = await uploadProfileImage(selectedFile);
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(payload.imageUrl);
      setSelectedFile(null);
      pushToast({
        title: "Profile picture updated",
        description: "Your new profile image was uploaded successfully.",
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to upload profile picture.";
      setProfileImageError(message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [selectedFile, previewUrl, pushToast, router]);

  /* Profile form submit */
  const onProfileSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setProfileError(null);

      const parsed = profileSchema.safeParse({ name, bio });
      if (!parsed.success) {
        setProfileError(
          parsed.error.issues[0]?.message ?? "Invalid profile input."
        );
        return;
      }

      setIsSavingProfile(true);

      const result = (await authClient.updateUser({
        name: parsed.data.name,
      })) as { error?: { message?: string } };

      setIsSavingProfile(false);

      if (result.error) {
        setProfileError(
          result.error.message ?? "Unable to update profile."
        );
        return;
      }

      pushToast({
        title: "Profile updated",
        description: "Your profile details were saved.",
        tone: "success",
      });
      router.refresh();
    },
    [name, bio, pushToast, router]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Avatar / Image Upload ── */}
      <Card variant="default" className="lg:col-span-1">
        <CardBody className="flex flex-col items-center gap-5 py-8">
          {/* Avatar preview */}
          <div className="group relative">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-border-default bg-bg-subtle shadow-[var(--shadow-card)]">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Profile preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-text-muted">
                  {avatarInitials || "U"}
                </div>
              )}
            </div>

            {/* Camera overlay */}
            <label
              htmlFor="settings-avatar-input"
              className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-bg-surface bg-accent-primary text-white shadow-[var(--shadow-sm)] transition-transform hover:scale-110"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" aria-hidden />
            </label>
            <input
              id="settings-avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onImageSelect}
              className="sr-only"
            />
          </div>

          <div className="text-center">
            <p className="font-display text-lg font-bold text-text-primary">
              {initialProfile.name}
            </p>
            <p className="text-sm text-text-secondary">
              {initialProfile.email}
            </p>
          </div>

          {selectedFile ? (
            <Button
              variant="primary"
              size="sm"
              loading={isUploadingImage}
              iconLeft={<Upload />}
              onClick={onImageUpload}
              width="full"
            >
              Upload picture
            </Button>
          ) : null}

          {profileImageError ? (
            <p className="text-center text-xs font-medium text-accent-danger">
              {profileImageError}
            </p>
          ) : null}

          <p className="text-center text-xs text-text-muted">
            JPG, PNG, WEBP, or GIF. Max 2MB.
          </p>
        </CardBody>
      </Card>

      {/* ── Profile Form ── */}
      <Card variant="default" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <p className="text-sm text-text-secondary">
            Update your personal details visible to other users.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={onProfileSubmit} noValidate className="space-y-5">
            <Input
              label="Display name"
              name="name"
              id="settings-name"
              prefix={<User />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />

            <Textarea
              label="Bio"
              name="bio"
              id="settings-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others a bit about yourself..."
              maxLength={300}
              showCount
              autoResize
              maxRows={5}
              rows={3}
            />

            <Divider />

            {/* Academic info (read-only context) */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Class"
                name="class"
                id="settings-class"
                defaultValue={initialProfile.studentClass}
                readOnly
                className="cursor-default opacity-70"
              />
              <Input
                label="Degree"
                name="degree"
                id="settings-degree"
                defaultValue={initialProfile.degree}
                readOnly
                className="cursor-default opacity-70"
              />
              <Input
                label="Board"
                name="board"
                id="settings-board"
                defaultValue={initialProfile.board}
                readOnly
                className="cursor-default opacity-70"
              />
            </div>
            <p className="text-xs text-text-muted">
              Academic details are managed from your registration. Contact
              support to update.
            </p>

            {profileError ? (
              <Alert variant="danger" title="Error">
                {profileError}
              </Alert>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSavingProfile}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Preferences Tab
   ═══════════════════════════════════════════ */

function PreferencesTab({ initialBoard }: { initialBoard: string }) {
  const { pushToast } = useToast();
  const [selectedBoard, setSelectedBoard] = useState(
    initialBoard || "federal"
  );
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const onBoardChange = useCallback(
    (value: string) => {
      setSelectedBoard(value);
      pushToast({
        title: "Board preference saved",
        description: `Default board set to ${BOARDS.find((b) => b.value === value)?.label ?? value}.`,
        tone: "success",
      });
    },
    [pushToast]
  );

  const toggleSubject = useCallback((subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Board selector ── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-primary" aria-hidden />
            <CardTitle>Default Board</CardTitle>
          </div>
          <p className="text-sm text-text-secondary">
            Choose your education board to see relevant content first.
          </p>
        </CardHeader>
        <CardBody>
          <RadixSelect
            value={selectedBoard}
            onValueChange={onBoardChange}
            placeholder="Select your board..."
            label="Education Board"
          >
            {BOARDS.map((board) => (
              <SelectItem key={board.value} value={board.value}>
                {board.label}
              </SelectItem>
            ))}
          </RadixSelect>
        </CardBody>
      </Card>

      {/* ── Theme ── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-accent-primary" aria-hidden />
            <CardTitle>Appearance</CardTitle>
          </div>
          <p className="text-sm text-text-secondary">
            Choose between light, dark, or system theme.
          </p>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">
              Interface theme
            </p>
            <p className="text-xs text-text-muted">
              System option follows your OS preference.
            </p>
          </div>
          <ThemeToggle />
        </CardBody>
      </Card>

      {/* ── Subject interests ── */}
      <Card variant="default" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subjects of Interest</CardTitle>
            <p className="text-sm text-text-secondary">
            Select the subjects you&apos;re studying. This helps personalize your
            dashboard and recommendations.
            </p>
          </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((subject) => (
              <label
                key={subject}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-150",
                  selectedSubjects.includes(subject)
                    ? "border-accent-primary bg-accent-primary/5 shadow-[var(--shadow-sm)]"
                    : "border-border-default bg-bg-surface hover:border-border-strong hover:bg-bg-elevated"
                )}
              >
                <Checkbox
                  name={`subject-${subject}`}
                  checked={selectedSubjects.includes(subject)}
                  onChange={() => toggleSubject(subject)}
                />
                <span className="text-sm font-medium text-text-primary">
                  {subject}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={() =>
                pushToast({
                  title: "Preferences saved",
                  description: `${selectedSubjects.length} subject${selectedSubjects.length !== 1 ? "s" : ""} selected.`,
                  tone: "success",
                })
              }
            >
              Save Preferences
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Notifications Tab
   ═══════════════════════════════════════════ */

function NotificationsTab({ initialLeaderboard }: { initialLeaderboard: LeaderboardSettings }) {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    "quiz-reminders": true,
    "forum-replies": true,
    "streak-alerts": true,
    "weekly-summary": false,
  });
  const [leaderboardPublic, setLeaderboardPublic] = useState(initialLeaderboard.leaderboardPublic);
  const [isSavingLeaderboard, setIsSavingLeaderboard] = useState(false);

  const toggleSetting = useCallback(
    (id: string, checked: boolean) => {
      setSettings((prev) => ({ ...prev, [id]: checked }));
      const setting = NOTIFICATION_SETTINGS.find((s) => s.id === id);
      pushToast({
        title: checked ? "Notification enabled" : "Notification disabled",
        description: setting?.label ?? id,
        tone: "info",
      });
    },
    [pushToast]
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent-primary" aria-hidden />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <p className="text-sm text-text-secondary">
            Control which notifications you receive.
          </p>
        </CardHeader>
        <CardBody className="divide-y divide-border-default">
          {NOTIFICATION_SETTINGS.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-subtle">
                  <IconComp
                    className="h-5 w-5 text-text-secondary"
                    aria-hidden
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <Switch
                    id={item.id}
                    name={item.id}
                    label={item.label}
                    description={item.description}
                    checked={settings[item.id] ?? false}
                    onCheckedChange={(checked) =>
                      toggleSetting(item.id, checked as boolean)
                    }
                  />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent-primary" aria-hidden />
            <CardTitle>Leaderboard Privacy</CardTitle>
          </div>
          <p className="text-sm text-text-secondary">
            Choose whether your profile appears publicly in competitive rankings.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Switch
            id="leaderboard-public"
            name="leaderboard-public"
            checked={leaderboardPublic}
            onCheckedChange={async (checked) => {
              const nextValue = checked as boolean;
              const previousValue = leaderboardPublic;
              setLeaderboardPublic(nextValue);
              setIsSavingLeaderboard(true);

              try {
                const result = await updateLeaderboardSettings(nextValue);
                setLeaderboardPublic(result.leaderboardPublic);
                pushToast({
                  title: result.leaderboardPublic ? "Leaderboard enabled" : "Leaderboard privacy updated",
                  description: result.leaderboardPublic
                    ? "Your profile can now appear in leaderboard rankings."
                    : "Your profile is now hidden from public leaderboard entries.",
                  tone: "success"
                });
              } catch (error) {
                setLeaderboardPublic(previousValue);
                pushToast({
                  title: "Unable to update leaderboard privacy",
                  description: error instanceof Error ? error.message : "Please try again.",
                  tone: "error"
                });
              } finally {
                setIsSavingLeaderboard(false);
              }
            }}
            label="Show me on public leaderboards"
            description="You will still see your own rank in context even when hidden from public entries."
          />

          <div className="rounded-xl border border-border-default bg-bg-subtle/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={leaderboardPublic ? "success" : "warning"}>
                {leaderboardPublic ? "Public" : "Private"}
              </Badge>
              {initialLeaderboard.badge ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
                    initialLeaderboard.badge === "gold" && "border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300",
                    initialLeaderboard.badge === "silver" && "border-slate-400/60 bg-slate-400/15 text-slate-700 dark:text-slate-200",
                    initialLeaderboard.badge === "bronze" && "border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-300"
                  )}
                >
                  Top 100 {initialLeaderboard.badge}
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              {initialLeaderboard.badge
                ? "You currently hold a top-100 leaderboard badge on your profile."
                : "Reach the global top 100 in XP to unlock a bronze, silver, or gold profile badge."}
            </p>
            {isSavingLeaderboard ? <p className="mt-2 text-xs text-text-muted">Saving preference…</p> : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Account Tab
   ═══════════════════════════════════════════ */

function AccountTab({ email }: { email: string }) {
  const router = useRouter();
  const { pushToast } = useToast();

  /* Change password state */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  );
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /* Delete account state */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  /* Change password handler */
  const onChangePassword = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setPasswordErrors({});

      const parsed = passwordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            errors[key] = issue.message;
          }
        }
        setPasswordErrors(errors);
        return;
      }

      setIsChangingPassword(true);

      try {
        const result = (await authClient.changePassword({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        })) as { error?: { message?: string } };

        if (result.error) {
          setPasswordErrors({
            currentPassword:
              result.error.message ?? "Failed to change password.",
          });
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        pushToast({
          title: "Password changed",
          description: "Your password has been updated successfully.",
          tone: "success",
        });
      } catch (error) {
        setPasswordErrors({
          currentPassword:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.",
        });
      } finally {
        setIsChangingPassword(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, pushToast]
  );

  /* Delete account handler */
  const onDeleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);

    try {
      const result = (await authClient.deleteUser()) as {
        error?: { message?: string };
      };

      if (result.error) {
        pushToast({
          title: "Unable to delete account",
          description:
            result.error.message ?? "Something went wrong. Try again.",
          tone: "error",
        });
        return;
      }

      pushToast({
        title: "Account deleted",
        description: "Your account has been permanently removed.",
        tone: "info",
      });
      router.push("/login");
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        tone: "error",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  }, [pushToast, router]);

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Email (read-only) ── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent-primary" aria-hidden />
            <CardTitle>Email Address</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <Input
            label="Email"
            name="email"
            id="settings-email"
            prefix={<Mail />}
            value={email}
            readOnly
            className="cursor-default opacity-70"
          />
          <p className="mt-2 text-xs text-text-muted">
            Your email cannot be changed. Contact support if needed.
          </p>
        </CardBody>
      </Card>

      {/* ── Change Password ── */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound
              className="h-5 w-5 text-accent-primary"
              aria-hidden
            />
            <CardTitle>Change Password</CardTitle>
          </div>
          <p className="text-sm text-text-secondary">
            Update your password regularly to keep your account secure.
          </p>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={onChangePassword}
            noValidate
            className="space-y-4"
          >
            <PasswordInput
              label="Current password"
              id="current-password"
              name="currentPassword"
              icon={Lock}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={passwordErrors.currentPassword}
              placeholder="Enter current password"
              autoComplete="current-password"
            />

            <PasswordInput
              label="New password"
              id="new-password"
              name="newPassword"
              icon={Lock}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordErrors.newPassword}
              placeholder="Enter new password"
              autoComplete="new-password"
            />

            <PasswordInput
              label="Confirm new password"
              id="confirm-password"
              name="confirmPassword"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordErrors.confirmPassword}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={isChangingPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── Danger Zone ── */}
      <Card
        variant="bordered"
        className="!border-accent-danger/30"
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2
              className="h-5 w-5 text-accent-danger"
              aria-hidden
            />
            <CardTitle className="!text-accent-danger">
              Danger Zone
            </CardTitle>
          </div>
          <p className="text-sm text-text-secondary">
            Irreversible actions that permanently affect your account.
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Delete your account
              </p>
              <p className="text-xs text-text-muted">
                Once deleted, all your data, progress, and achievements will
                be permanently removed. This action cannot be undone.
              </p>
            </div>

            <Button
              variant="danger"
              iconLeft={<Trash2 />}
              onClick={() => setShowDeleteDialog(true)}
              className="shrink-0"
            >
              Delete Account
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete your account?"
        description="This action is irreversible. All your learning progress, quiz scores, achievements, and profile data will be permanently deleted. Are you sure you want to proceed?"
        confirmLabel="Yes, delete my account"
        cancelLabel="Cancel"
        danger
        isPending={isDeletingAccount}
        onConfirm={onDeleteAccount}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
