import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Home,
  BarChart3,
  Target,
  User,
  LogOut,
} from "lucide-react";

async function getMemberSession() {
  const cookieStore = await cookies();
  const memberToken = cookieStore.get("member_token");

  if (!memberToken) {
    return null;
  }

  // Verify token
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/member/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `member_token=${memberToken.value}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Failed to verify member session:", error);
  }

  return null;
}

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMemberSession();

  if (!session) {
    redirect("/member/login");
  }

  const navItems = [
    { href: "/member", icon: Home, label: "Dashboard" },
    { href: "/member/kpi", icon: BarChart3, label: "KPI Tracking" },
    { href: "/member/goals", icon: Target, label: "My Goals" },
    { href: "/member/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <img
                src="/nf-logo.png"
                alt="NF Mentoring"
                className="h-8 w-auto"
              />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.firstName}
              </span>
              <Link
                href="/member/logout"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 hover:text-red-600"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
