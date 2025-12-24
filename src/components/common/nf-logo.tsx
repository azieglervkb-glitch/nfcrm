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
      viewBox="0 0 50 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizes[size], className)}
    >
      {/* NF Mentoring double swoosh logo - exact match */}
      {/* Left swoosh - curves up from bottom-left */}
      <path
        d="M2 32 C2 32 6 32 8 30 C12 26 18 14 22 10 C26 6 30 6 34 10 C36 12 38 16 38 16 C38 16 36 12 32 10 C28 8 24 10 20 16 C16 22 10 32 6 34 C4 35 2 34 2 32 Z"
        fill="currentColor"
      />
      {/* Right swoosh - curves down from top-right */}
      <path
        d="M48 8 C48 8 44 8 42 10 C38 14 32 26 28 30 C24 34 20 34 16 30 C14 28 12 24 12 24 C12 24 14 28 18 30 C22 32 26 30 30 24 C34 18 40 8 44 6 C46 5 48 6 48 8 Z"
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
