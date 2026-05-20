"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      let success = false;
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          success = true;
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          success = document.execCommand("copy");
          document.body.removeChild(textarea);
        }
      } catch {
        success = false;
      }

      if (success) {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), resetMs);
      }
    },
    [resetMs]
  );

  return { copied, copy };
}
