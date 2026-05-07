"use client";

export function AnswerEditor({
  value,
  onChange,
  exerciseType
}: {
  value: string;
  onChange: (value: string) => void;
  exerciseType: "short" | "long";
}) {
  const isLong = exerciseType === "long";

  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-lg border border-border-primary bg-surface-secondary p-4 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-y"
        rows={isLong ? 8 : 4}
        placeholder={`Write your ${isLong ? "detailed" : "concise"} answer here...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {isLong && value.length > 0 && (
        <p className="text-xs text-text-secondary">
          {value.length} characters
        </p>
      )}
    </div>
  );
}
