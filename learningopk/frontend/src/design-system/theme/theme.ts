export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "learningopk-design-system-theme";

export const themeTokens = {
  colors: {
    light: {
      background: "#faf8f5",
      foreground: "#1a1814",
      card: "#ffffff",
      cardForeground: "#1a1814",
      popover: "#ffffff",
      popoverForeground: "#1a1814",
      primary: "#2d2a24",
      primaryForeground: "#faf8f5",
      secondary: "#f0ede8",
      secondaryForeground: "#1a1814",
      muted: "#e8e4de",
      mutedForeground: "#6b6560",
      accent: "#e8e4de",
      accentForeground: "#1a1814",
      destructive: "#c44536",
      destructiveForeground: "#ffffff",
      border: "#d4cfc7",
      input: "#d4cfc7",
      ring: "#2d2a24",
    },
    dark: {
      background: "#141210",
      foreground: "#e8e4de",
      card: "#1e1b18",
      cardForeground: "#e8e4de",
      popover: "#1e1b18",
      popoverForeground: "#e8e4de",
      primary: "#e8e4de",
      primaryForeground: "#141210",
      secondary: "#2a2520",
      secondaryForeground: "#e8e4de",
      muted: "#2a2520",
      mutedForeground: "#9a938a",
      accent: "#2a2520",
      accentForeground: "#e8e4de",
      destructive: "#e86b5b",
      destructiveForeground: "#141210",
      border: "#3a3530",
      input: "#3a3530",
      ring: "#e8e4de",
    },
  },
  pastel: {
    light: {
      dustyRose: "#d4a5a5",
      sage: "#a5c4a5",
      slateBlue: "#a5b4c4",
      warmSand: "#d4c4a5",
      lavender: "#c4a5d4",
      peach: "#d4b8a5",
    },
    dark: {
      dustyRose: "#6b5454",
      sage: "#546554",
      slateBlue: "#545c6b",
      warmSand: "#6b6454",
      lavender: "#645468",
      peach: "#6b5e54",
    },
  },
  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
  },
  typography: {
    fontFamily: {
      heading: '"DM Serif Display", Georgia, serif',
      body: '"Source Serif 4", Georgia, serif',
      mono: '"JetBrains Mono", monospace',
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeight: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  },
  shadows: {
    offset: {
      sm: "2px 2px 0px",
      md: "4px 4px 0px",
      lg: "6px 6px 0px",
    },
  },
  animation: {
    duration: {
      fast: "150ms",
      normal: "200ms",
      slow: "300ms",
    },
  },
};

export type ThemeTokens = typeof themeTokens;

export const getCssVariables = (mode: ThemeMode) => {
  const colors = themeTokens.colors[mode];
  const pastels = themeTokens.pastel[mode];
  
  return {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--card": colors.card,
    "--card-foreground": colors.cardForeground,
    "--popover": colors.popover,
    "--popover-foreground": colors.popoverForeground,
    "--primary": colors.primary,
    "--primary-foreground": colors.primaryForeground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondaryForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--accent": colors.accent,
    "--accent-foreground": colors.accentForeground,
    "--destructive": colors.destructive,
    "--destructive-foreground": colors.destructiveForeground,
    "--border": colors.border,
    "--input": colors.input,
    "--ring": colors.ring,
    "--pastel-dusty-rose": pastels.dustyRose,
    "--pastel-sage": pastels.sage,
    "--pastel-slate-blue": pastels.slateBlue,
    "--pastel-warm-sand": pastels.warmSand,
    "--pastel-lavender": pastels.lavender,
    "--pastel-peach": pastels.peach,
    "--shadow-offset-sm": themeTokens.shadows.offset.sm,
    "--shadow-offset-md": themeTokens.shadows.offset.md,
    "--shadow-offset-lg": themeTokens.shadows.offset.lg,
    "--font-heading": themeTokens.typography.fontFamily.heading,
    "--font-body": themeTokens.typography.fontFamily.body,
    "--font-mono": themeTokens.typography.fontFamily.mono,
  };
};
