"use client";

import { useState, useCallback, useMemo } from "react";

interface FillBlanksProps {
  statements?: Array<{
    text: string;
    blanksAnswer?: string[];
    blankCount?: number;
  }> | null;
  blanksAnswer?: string[] | null;
  blankCount?: number | null;
  onChange: (answers: string[]) => void;
}

export function FillBlanksInput({
  statements,
  blanksAnswer,
  blankCount,
  onChange
}: FillBlanksProps) {
  const totalBlankCount = useMemo(() => {
    if (blankCount != null) return blankCount;
    if (statements && statements.length > 0) {
      return statements.reduce((sum, s) => sum + (s.blankCount ?? s.blanksAnswer?.length ?? 0), 0);
    }
    return blanksAnswer?.length ?? 0;
  }, [statements, blanksAnswer, blankCount]);

  const [values, setValues] = useState<string[]>(() =>
    Array.from({ length: totalBlankCount }, () => "")
  );

  const handleChange = useCallback(
    (index: number, value: string) => {
      setValues(prev => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    []
  );

  const syncToParent = useCallback(() => {
    setValues(prev => {
      onChange(prev);
      return prev;
    });
  }, [onChange]);

  if (statements && statements.length > 0) {
    let globalBlankIndex = 0;
    return (
      <div className="space-y-4">
        {statements.map((stmt, stmtIdx) => {
          const parts = stmt.text.split("___");
          return (
            <div key={stmtIdx} className="text-sm">
              {parts.map((part, partIdx) => {
                const isLast = partIdx === parts.length - 1;
                if (isLast) return <span key={partIdx}>{part}</span>;
                const blankIdx = globalBlankIndex++;
                return (
                  <span key={partIdx}>
                    <span>{part}</span>
                    <input
                      type="text"
                      className="mx-1 w-24 rounded border border-border-primary bg-surface-secondary px-2 py-0.5 text-sm focus:border-accent-primary focus:outline-none"
                      placeholder="..."
                      value={values[blankIdx] ?? ""}
                      onChange={(e) => {
                        handleChange(blankIdx, e.target.value);
                        syncToParent();
                      }}
                    />
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: totalBlankCount }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Blank {i + 1}:</span>
          <input
            type="text"
            className="flex-1 rounded border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm focus:border-accent-primary focus:outline-none"
            placeholder="Type your answer..."
            value={values[i] ?? ""}
            onChange={(e) => {
              handleChange(i, e.target.value);
              syncToParent();
            }}
          />
        </div>
      ))}
    </div>
  );
}
