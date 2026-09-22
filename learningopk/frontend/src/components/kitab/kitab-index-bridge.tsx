"use client";

import { useEffect, useState } from "react";
import type { IndexEntry } from "./kitab-index";
import { KitabIndex } from "./kitab-index";
import type { QuietBarLink } from "./quiet-bar";
import { QuietBar } from "./quiet-bar";
import { ThemeSeal } from "./theme-seal";

/* ═══════════════════════════════════════════════════════════════
   KitabIndexClientBridge — client island that owns the Index
   open state, the ⌘K/Ctrl+K listener, and renders the QuietBar
   (whose Index button toggles the overlay).
   ═══════════════════════════════════════════════════════════════ */

export function KitabIndexClientBridge({
  entries,
  links,
}: {
  entries: IndexEntry[];
  links: QuietBarLink[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <QuietBar
        links={links}
        onOpenIndex={() => setOpen(true)}
        renderThemeToggle={() => <ThemeSeal />}
      />
      <KitabIndex open={open} onClose={() => setOpen(false)} entries={entries} />
    </>
  );
}
