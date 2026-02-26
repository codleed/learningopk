export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "learningopk-theme";

export const themeInitScript = `(() => {
  const root = document.documentElement;
  try {
    const stored = window.localStorage.getItem("${THEME_STORAGE_KEY}");
    const theme = stored === "dark" ? "dark" : "light";
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
})();`;

export const getResolvedTheme = (): AppTheme => {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

export const applyTheme = (theme: AppTheme): void => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
};
