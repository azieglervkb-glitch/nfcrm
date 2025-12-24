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
        {/* Logo - NF Mentoring curved N ribbon */}
        <div className="flex items-center gap-3 px-6 py-5">
          <svg
            viewBox="0 0 50 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            {/* Curved ribbon N shape */}
            <path
              d="M10 40 C10 40 10 15 10 10 C10 5 15 5 18 8 L32 28 C32 28 32 10 32 10 C32 5 42 5 42 10 C42 10 42 40 42 40 C42 45 37 45 34 42 L20 22 C20 22 20 40 20 40 C20 45 10 45 10 40 Z"
              fill="#dc2626"
            />
          </svg>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-muted-foreground tracking-wide">NF</span>
            <span className="text-xs text-muted-foreground">MENTORING</span>
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
