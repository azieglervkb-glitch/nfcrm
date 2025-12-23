import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "danger" | "info" | "default";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  info: "bg-info text-white",
  default: "bg-secondary text-secondary-foreground",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        statusStyles[status],
        className
      )}
    >
      {label}
    </span>
  );
}

// Helper function to get status type from member status
export function getMemberStatusType(status: string): StatusType {
  switch (status) {
    case "AKTIV":
      return "success";
    case "PAUSIERT":
      return "warning";
    case "GEKUENDIGT":
      return "danger";
    case "INAKTIV":
      return "default";
    default:
      return "default";
  }
}

// Helper function to get task priority type
export function getTaskPriorityType(priority: string): StatusType {
  switch (priority) {
    case "URGENT":
      return "danger";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "info";
    case "LOW":
      return "default";
    default:
      return "default";
  }
}
