import { cn } from "@/lib/utils";

interface FeelingEmojiProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getEmoji(score: number): string {
  if (score <= 2) return "😢";
  if (score <= 4) return "😕";
  if (score <= 6) return "😐";
  if (score <= 8) return "😊";
  return "😁";
}

function getColor(score: number): string {
  if (score <= 3) return "text-danger";
  if (score <= 5) return "text-warning";
  if (score <= 7) return "text-info";
  return "text-success";
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

export function FeelingEmoji({
  score,
  showScore = true,
  size = "md",
  className,
}: FeelingEmojiProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className={sizeClasses[size]}>{getEmoji(score)}</span>
      {showScore && (
        <span className={cn("font-semibold", getColor(score))}>{score}</span>
      )}
    </div>
  );
}
