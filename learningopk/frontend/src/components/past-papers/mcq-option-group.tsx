"use client";

export function MCQOptionGroup({
  options,
  selectedOption,
  onChange,
}: {
  options: Array<{ key: string; text: string }>;
  selectedOption: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.key}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
            selectedOption === opt.key
              ? "border-accent-primary bg-accent-primary-light/10"
              : "border-border-primary hover:border-border-secondary"
          }`}
        >
          <input
            type="radio"
            name="mcq-option"
            value={opt.key}
            checked={selectedOption === opt.key}
            onChange={() => onChange(opt.key)}
            className="mt-0.5 h-4 w-4 accent-accent-primary"
          />
          <span className="flex gap-2 text-sm">
            <span className="font-semibold text-text-secondary uppercase">{opt.key}.</span>
            <span className="text-text-primary">{opt.text}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
