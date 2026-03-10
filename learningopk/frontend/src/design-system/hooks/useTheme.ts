"use client";

import { useThemeContext } from "../theme/ThemeProvider";

export function useTheme() {
  return useThemeContext();
}
