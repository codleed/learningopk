"use client";

export function FillBlanksInput({
  statements,
  blanksAnswer,
  onChange
}: {
  statements?: Array<{ text: string; blanksAnswer: string[] }> | null;
  blanksAnswer?: string[] | null;
  onChange: (answers: string[]) => void;
}) {
  if (statements && statements.length > 0) {
    return (
      <div className="space-y-4">
        {statements.map((stmt, stmtIdx) => {
          const parts = stmt.text.split("___");
          return (
            <div key={stmtIdx} className="text-sm">
              {parts.map((part, partIdx) => (
                <span key={partIdx}>
                  <span>{part}</span>
                  {partIdx < parts.length - 1 && (
                    <input
                      type="text"
                      className="blank-stmt-input mx-1 w-24 rounded border border-border-primary bg-surface-secondary px-2 py-0.5 text-sm focus:border-accent-primary focus:outline-none"
                      placeholder="..."
                      onChange={() => {
                        const inputs = document.querySelectorAll<HTMLInputElement>(".blank-stmt-input");
                        const values = Array.from(inputs).map(inp => inp.value);
                        onChange(values);
                      }}
                    />
                  )}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  const blankCount = blanksAnswer?.length ?? 0;
  return (
    <div className="space-y-2">
      {Array.from({ length: blankCount }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Blank {i + 1}:</span>
          <input
            type="text"
            className="blank-simple-input flex-1 rounded border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm focus:border-accent-primary focus:outline-none"
            placeholder="Type your answer..."
            onChange={() => {
              const inputs = document.querySelectorAll<HTMLInputElement>(".blank-simple-input");
              const values = Array.from(inputs).map(inp => inp.value);
              onChange(values);
            }}
          />
        </div>
      ))}
    </div>
  );
}
