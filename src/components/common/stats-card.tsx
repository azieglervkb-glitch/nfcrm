import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconClassName,
  className,
}: StatsCardProps) {
  return (
    <div className={cn("stats-card", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {Icon && (
            <div className={cn("mb-2 text-muted-foreground", iconClassName)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{title}</p>
          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.positive ? "text-success" : "text-destructive"
                  )}
                >
                  {trend.value}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
