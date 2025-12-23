import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  colorClassName?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  className,
  colorClassName = "bg-primary",
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const clampedPercentage = Math.min(percentage, 100);

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium">
              {value}/{max} ({percentage}%)
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className={cn("h-2 rounded-full transition-all", colorClassName)}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
