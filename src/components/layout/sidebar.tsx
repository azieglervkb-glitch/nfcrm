"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  AlertCircle,
  Zap,
  ScrollText,
  TrendingUp,
  CheckSquare,
  MessageSquare,
  FileText,
  Settings,
  UserCog,
  HelpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  user: {
    vorname: string;
    nachname: string;
    role: string;
    avatarUrl?: string | null;
  };
}

const menuItems = [
  {
    category: "HOME",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    category: "MITGLIEDER-MANAGEMENT",
    items: [
      { label: "Mitglieder", href: "/members", icon: Users },
      { label: "KPI-Tracking", href: "/kpis", icon: BarChart3 },
      { label: "Ausstehende KPIs", href: "/kpis/pending", icon: AlertCircle },
    ],
  },
  {
    category: "AUTOMATIONEN",
    items: [
      { label: "Regeln", href: "/automations/rules", icon: Zap },
      { label: "Logs", href: "/automations/logs", icon: ScrollText },
    ],
  },
  {
    category: "SALES",
    items: [
      { label: "Upsell Pipeline", href: "/upsell", icon: TrendingUp },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    category: "KOMMUNIKATION",
    items: [
      { label: "Nachrichten-Log", href: "/communications", icon: MessageSquare },
      { label: "Templates", href: "/communications/templates", icon: FileText },
    ],
  },
  {
    category: "EINSTELLUNGEN",
    items: [
      { label: "Team", href: "/settings/team", icon: UserCog },
      { label: "System", href: "/settings", icon: Settings },
    ],
  },
];

function getRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super-Admin";
    case "ADMIN":
      return "Admin";
    case "COACH":
      return "Coach";
    default:
      return role;
  }
}

function getInitials(vorname: string, nachname: string): string {
  return `${vorname.charAt(0)}${nachname.charAt(0)}`.toUpperCase();
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
        {/* Logo - NF Mentoring exact logo (double swoosh) */}
        <div className="flex items-center gap-2 px-6 py-5">
          <svg
            viewBox="0 0 50 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-9 w-11"
          >
            {/* Left swoosh - curves up from bottom-left */}
            <path
              d="M2 32 C2 32 6 32 8 30 C12 26 18 14 22 10 C26 6 30 6 34 10 C36 12 38 16 38 16 C38 16 36 12 32 10 C28 8 24 10 20 16 C16 22 10 32 6 34 C4 35 2 34 2 32 Z"
              fill="#dc2626"
            />
            {/* Right swoosh - curves down from top-right */}
            <path
              d="M48 8 C48 8 44 8 42 10 C38 14 32 26 28 30 C24 34 20 34 16 30 C14 28 12 24 12 24 C12 24 14 28 18 30 C22 32 26 30 30 24 C34 18 40 8 44 6 C46 5 48 6 48 8 Z"
              fill="#dc2626"
            />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold text-foreground">NF</span>
            <span className="text-[9px] text-muted-foreground tracking-wider">MENTORING</span>
          </div>
        </div>

        {/* User Info */}
        <div className="mx-3 mb-4 rounded-lg bg-muted p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {getInitials(user.vorname, user.nachname)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.vorname} {user.nachname}
              </p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {menuItems.map((section) => (
            <div key={section.category} className="mb-4">
              <p className="sidebar-category">{section.category}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "sidebar-item",
                      active && "active"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Help Button */}
        <div className="border-t border-sidebar-border p-3">
          <button className="sidebar-item w-full text-primary hover:bg-primary/5 hover:text-primary">
            <HelpCircle className="h-5 w-5" />
            <span>Help-Center öffnen</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
