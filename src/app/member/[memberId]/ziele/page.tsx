"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Target,
  User,
  Home,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";

export default function MemberGoalsPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  const navItems = [
    { href: `/member/${memberId}`, icon: Home, label: "Dashboard" },
    { href: `/member/${memberId}/kpi`, icon: BarChart3, label: "KPI Tracking" },
    { href: `/member/${memberId}/ziele`, icon: Target, label: "Meine Ziele" },
    { href: `/member/${memberId}/profil`, icon: User, label: "Profil" },
  ];

  // Placeholder goals - will be implemented with actual data later
  const goals = [
    {
      id: 1,
      title: "Umsatz verdoppeln",
      description: "Von 5.000€ auf 10.000€ monatlich",
      deadline: "31.03.2025",
      progress: 60,
      status: "in_progress",
    },
    {
      id: 2,
      title: "20 Neukunden gewinnen",
      description: "Durch aktive Akquise und Empfehlungen",
      deadline: "30.06.2025",
      progress: 25,
      status: "in_progress",
    },
    {
      id: 3,
      title: "Erstgespräch-Quote verbessern",
      description: "Von 30% auf 50% Abschlussquote",
      deadline: "28.02.2025",
      progress: 100,
      status: "completed",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <img src="/nf-logo.png" alt="NF Mentoring" className="h-8 w-auto" />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.href.includes("/ziele")
                        ? "text-red-600 bg-red-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium ${
                item.href.includes("/ziele") ? "text-red-600" : "text-gray-600"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meine Ziele</h1>
              <p className="text-gray-600">Verfolge deine S.M.A.R.T. Ziele</p>
            </div>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Neues Ziel
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {goals.filter((g) => g.status === "completed").length}
                </p>
                <p className="text-sm text-gray-600">Erreicht</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {goals.filter((g) => g.status === "in_progress").length}
                </p>
                <p className="text-sm text-gray-600">In Arbeit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-gray-900">{goals.length}</p>
                <p className="text-sm text-gray-600">Gesamt</p>
              </CardContent>
            </Card>
          </div>

          {/* Goals List */}
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {goal.status === "completed" ? (
                        <div className="p-2 bg-green-100 rounded-full">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-orange-100 rounded-full">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <CardDescription>{goal.description}</CardDescription>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      Deadline: {goal.deadline}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fortschritt</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          goal.progress >= 100 ? "bg-green-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {goals.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Noch keine Ziele definiert</p>
                <Button className="bg-red-600 hover:bg-red-700">
                  Erstes Ziel erstellen
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
