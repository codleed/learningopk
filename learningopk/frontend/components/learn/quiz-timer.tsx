type QuizTimerProps = {
  remainingSeconds: number;
  expired: boolean;
};

const formatTimeLeft = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

export function QuizTimer({ remainingSeconds, expired }: QuizTimerProps) {
  return (
    <div className="text-right">
      <p className={["text-2xl font-bold", expired ? "text-rose-700" : "text-foreground"].join(" ")}>
        {formatTimeLeft(remainingSeconds)}
      </p>
      <p className="text-xs text-muted-foreground">Time left</p>
    </div>
  );
}

