import { cn } from "@/lib/utils";

interface NFLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function NFLogo({ className, size = "md" }: NFLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizes[size], className)}
    >
      {/* NF Mentoring swoosh/ribbon N logo */}
      <path
        d="M8 32 C8 32 8 12 8 8 C8 4 12 4 14 6 C16 8 28 26 30 28 C30 28 30 8 30 8 C30 4 38 4 38 8 C38 8 38 28 38 32 C38 36 34 36 32 34 C30 32 18 14 16 12 C16 12 16 32 16 32 C16 36 8 36 8 32 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NFLogoWithText({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <NFLogo size="lg" className="text-primary" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground tracking-wide">NF</span>
        <span className="text-[10px] text-muted-foreground tracking-widest">MENTORING</span>
      </div>
    </div>
  );
}
