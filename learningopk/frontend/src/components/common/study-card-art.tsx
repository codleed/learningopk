import Image from "next/image";
import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  Languages,
  Leaf,
  Monitor,
  Moon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type StudyCardArtVariant = "subject" | "chapter" | "compact";

type StudyCardArtProps = {
  subject: string;
  title?: string;
  chapterNumber?: number;
  index?: number;
  variant?: StudyCardArtVariant;
  className?: string;
  coverImageUrl?: string | null;
};

type SubjectArtConfig = {
  accent: string;
  accentSoft: string;
  icon: LucideIcon;
  imageSrc?: string;
  motif: "orbit" | "grid" | "lattice" | "organic" | "editorial" | "scripture";
};

const DEFAULT_ART: SubjectArtConfig = {
  accent: "#64748B",
  accentSoft: "rgba(100, 116, 139, 0.16)",
  icon: Sparkles,
  imageSrc: "/subjects/science.svg",
  motif: "grid",
};

const SUBJECT_ART: Record<string, SubjectArtConfig> = {
  Mathematics: {
    accent: "#6366F1",
    accentSoft: "rgba(99, 102, 241, 0.18)",
    icon: Calculator,
    imageSrc: "/subjects/math.svg",
    motif: "grid",
  },
  Physics: {
    accent: "#06B6D4",
    accentSoft: "rgba(6, 182, 212, 0.18)",
    icon: Atom,
    imageSrc: "/subjects/physics.svg",
    motif: "orbit",
  },
  Chemistry: {
    accent: "#8B5CF6",
    accentSoft: "rgba(139, 92, 246, 0.18)",
    icon: FlaskConical,
    imageSrc: "/subjects/chemistry.svg",
    motif: "lattice",
  },
  Biology: {
    accent: "#22C55E",
    accentSoft: "rgba(34, 197, 94, 0.18)",
    icon: Leaf,
    imageSrc: "/subjects/biology.svg",
    motif: "organic",
  },
  English: {
    accent: "#F59E0B",
    accentSoft: "rgba(245, 158, 11, 0.18)",
    icon: BookOpen,
    imageSrc: "/subjects/english.svg",
    motif: "editorial",
  },
  Urdu: {
    accent: "#EC4899",
    accentSoft: "rgba(236, 72, 153, 0.18)",
    icon: Languages,
    imageSrc: "/subjects/urdu.svg",
    motif: "editorial",
  },
  "Pakistan Studies": {
    accent: "#14B8A6",
    accentSoft: "rgba(20, 184, 166, 0.18)",
    icon: Landmark,
    imageSrc: "/subjects/pak-studies.svg",
    motif: "editorial",
  },
  "Computer Science": {
    accent: "#3B82F6",
    accentSoft: "rgba(59, 130, 246, 0.18)",
    icon: Monitor,
    imageSrc: "/subjects/science.svg",
    motif: "grid",
  },
  Islamiat: {
    accent: "#A855F7",
    accentSoft: "rgba(168, 85, 247, 0.18)",
    icon: Moon,
    imageSrc: "/subjects/science.svg",
    motif: "scripture",
  },
};

function resolveArt(subject: string): SubjectArtConfig {
  return SUBJECT_ART[subject] ?? DEFAULT_ART;
}

function Motif({ motif, accent, seed }: { motif: SubjectArtConfig["motif"]; accent: string; seed: number }) {
  if (motif === "orbit") {
    return (
      <>
        <div className="absolute inset-4 rounded-full border" style={{ borderColor: `${accent}40`, transform: `rotate(${seed * 6}deg)` }} />
        <div className="absolute inset-9 rounded-full border" style={{ borderColor: `${accent}30`, transform: `rotate(${-seed * 4}deg)` }} />
        <div className="absolute left-1/2 top-5 h-3 w-3 -translate-x-1/2 rounded-full" style={{ backgroundColor: accent }} />
      </>
    );
  }

  if (motif === "lattice") {
    return (
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          transform: `rotate(${seed % 2 === 0 ? 10 : -10}deg) scale(1.08)`,
        }}
      />
    );
  }

  if (motif === "organic") {
    return (
      <>
        <div className="absolute -right-8 top-3 h-28 w-28 rounded-full border" style={{ borderColor: `${accent}30` }} />
        <div className="absolute left-6 top-10 h-20 w-20 rounded-[45%] border" style={{ borderColor: `${accent}35` }} />
      </>
    );
  }

  if (motif === "scripture") {
    return (
      <>
        <div className="absolute inset-x-6 top-7 h-px" style={{ backgroundColor: `${accent}45` }} />
        <div className="absolute inset-x-10 top-14 h-px" style={{ backgroundColor: `${accent}35` }} />
        <div className="absolute inset-x-4 top-21 h-px" style={{ backgroundColor: `${accent}25` }} />
      </>
    );
  }

  if (motif === "editorial") {
    return (
      <>
        <div className="absolute -left-6 top-4 h-20 w-20 rounded-full" style={{ backgroundColor: `${accent}1f` }} />
        <div className="absolute right-5 top-7 h-12 w-24 rounded-full" style={{ border: `1px solid ${accent}35` }} />
        <div className="absolute bottom-6 left-6 h-px w-24" style={{ backgroundColor: `${accent}55` }} />
      </>
    );
  }

  return (
    <div
      className="absolute inset-0 opacity-45"
      style={{
        backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
        backgroundSize: "26px 26px",
      }}
    />
  );
}

export function StudyCardArt({
  subject,
  title,
  chapterNumber,
  index = 0,
  variant = "subject",
  className,
  coverImageUrl,
}: StudyCardArtProps) {
  const art = resolveArt(subject);
  const Icon = art.icon;
  const seed = (chapterNumber ?? index + 1) % 12;
  const isChapter = variant === "chapter";
  const isCompact = variant === "compact";
  const hasCustomImage = !!coverImageUrl;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border border-white/40",
        isChapter ? "min-h-[150px] w-full sm:min-h-[170px]" : isCompact ? "min-h-[132px]" : "min-h-[188px]",
        className,
      )}
      style={{
        background: hasCustomImage
          ? undefined
          : `radial-gradient(circle at 18% 18%, ${art.accentSoft}, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(248,250,252,0.88) 48%, ${art.accentSoft} 100%)`,
      }}
      aria-hidden="true"
    >
      {hasCustomImage && (
        <>
          <Image
            src={coverImageUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(0,0,0,0.35), transparent 48%, rgba(0,0,0,0.25))`
            }}
          />
        </>
      )}
      {!hasCustomImage && (
        <>
          <div className="absolute inset-0">
            <Motif motif={art.motif} accent={art.accent} seed={seed} />
          </div>

          <div
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
            style={{ backgroundColor: `${art.accent}22` }}
          />
          <div
            className="absolute -bottom-10 left-4 h-24 w-24 rounded-full blur-2xl"
            style={{ backgroundColor: `${art.accent}1a` }}
          />

          <div className="absolute inset-x-0 top-0 h-px bg-white/70" />
        </>
      )}

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] text-text-secondary shadow-sm backdrop-blur"
          >
            {isChapter ? `Module ${String(chapterNumber ?? index + 1).padStart(2, "0")}` : subject}
          </div>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/75 shadow-sm backdrop-blur"
            style={{ color: art.accent }}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className={cn("relative flex items-end justify-between gap-3", isChapter ? "mt-6" : "mt-8") }>
          <div className="min-w-0">
            {title ? (
              <p className="line-clamp-2 max-w-[16rem] text-sm font-medium leading-5 text-text-primary/80">
                {title}
              </p>
            ) : null}
          </div>

          {art.imageSrc ? (
            <div className={cn("relative shrink-0 opacity-90", isCompact ? "h-14 w-14" : "h-20 w-20 sm:h-24 sm:w-24")}>
              <Image src={art.imageSrc} alt="" fill className="object-contain drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)]" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
