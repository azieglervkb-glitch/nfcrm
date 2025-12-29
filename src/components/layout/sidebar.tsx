"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserPlus,
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
  Bot,
  ClipboardList,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  user: {
    vorname: string;
    nachname: string;
    role: string;
    avatarUrl?: string | null;
    permissions?: string[];
  };
}

// Permission-to-href mapping
const PERMISSION_MAP: Record<string, string[]> = {
  dashboard: ["/dashboard"],
  leads: ["/leads"],
  members: ["/members"],
  kpis: ["/kpis", "/kpis/pending"],
  automations: ["/automations/rules", "/automations/logs"],
  upsell: ["/upsell"],
  tasks: ["/tasks"],
  communications: ["/communications", "/templates"],
  settings: ["/settings", "/settings/prompts", "/settings/forms"],
  team: ["/settings/team"],
};

const menuItems = [
  {
    category: "HOME",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard" },
    ],
  },
  {
    category: "KONTAKTE",
    items: [
      { label: "Leads", href: "/leads", icon: UserPlus, permission: "leads" },
      { label: "Mitglieder", href: "/members", icon: Users, permission: "members" },
    ],
  },
  {
    category: "KPI-TRACKING",
    items: [
      { label: "Übersicht", href: "/kpis", icon: BarChart3, permission: "kpis" },
      { label: "Ausstehend", href: "/kpis/pending", icon: AlertCircle, permission: "kpis" },
    ],
  },
  {
    category: "AUTOMATIONEN",
    items: [
      { label: "Regeln", href: "/automations/rules", icon: Zap, permission: "automations" },
      { label: "Logs", href: "/automations/logs", icon: ScrollText, permission: "automations" },
    ],
  },
  {
    category: "SALES",
    items: [
      { label: "Upsell Pipeline", href: "/upsell", icon: TrendingUp, permission: "upsell" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, permission: "tasks" },
    ],
  },
  {
    category: "KOMMUNIKATION",
    items: [
      { label: "Nachrichten-Log", href: "/communications", icon: MessageSquare, permission: "communications" },
      { label: "Templates", href: "/templates", icon: FileText, permission: "communications" },
    ],
  },
  {
    category: "EINSTELLUNGEN",
    items: [
      { label: "Team", href: "/settings/team", icon: UserCog, permission: "team" },
      { label: "AI Prompts", href: "/settings/prompts", icon: Bot, permission: "settings" },
      { label: "Formulare", href: "/settings/forms", icon: ClipboardList, permission: "settings" },
      { label: "System", href: "/settings", icon: Settings, permission: "settings" },
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
    case "MITARBEITER":
      return "Mitarbeiter";
    default:
      return role;
  }
}

// Check if user has permission for an item
function hasPermission(
  role: string,
  permissions: string[] | undefined,
  requiredPermission: string
): boolean {
  // SUPER_ADMIN and ADMIN have full access
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return true;
  }
  // COACH and MITARBEITER need explicit permission
  if (!permissions) return false;
  return permissions.includes(requiredPermission);
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
        {/* Logo - NF Mentoring */}
        <div className="flex justify-center py-5">
          <img
            src="/nf-logo.png"
            alt="NF Mentoring"
            className="h-12 w-auto"
          />
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
          {menuItems.map((section) => {
            // Filter items based on permissions
            const visibleItems = section.items.filter((item) =>
              hasPermission(user.role, user.permissions, item.permission)
            );
            
            // Hide entire category if no visible items
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={section.category} className="mb-4">
                <p className="sidebar-category">{section.category}</p>
                {visibleItems.map((item) => {
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
            );
          })}
        </nav>

      </div>
    </aside>
  );
}
