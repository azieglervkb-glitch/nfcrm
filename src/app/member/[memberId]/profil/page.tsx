"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Target,
  User,
  Home,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Package,
} from "lucide-react";

interface ProfileData {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  produkte: string[];
  status: string;
  membershipStart: string;
  onboardingCompleted: boolean;
  kpiTrackingActive: boolean;
  assignedCoach: {
    vorname: string;
    nachname: string;
  } | null;
}

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = params.memberId as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) {
      fetchProfile();
    }
  }, [memberId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/member/profile?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { href: `/member/${memberId}`, icon: Home, label: "Dashboard" },
    { href: `/member/${memberId}/kpi`, icon: BarChart3, label: "KPI Tracking" },
    { href: `/member/${memberId}/ziele`, icon: Target, label: "Meine Ziele" },
    { href: `/member/${memberId}/profil`, icon: User, label: "Profil" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

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
                      item.href.includes("/profil")
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
                item.href.includes("/profil") ? "text-red-600" : "text-gray-600"
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mein Profil</h1>
            <p className="text-gray-600">Deine Mitgliedschaftsinformationen</p>
          </div>

          {profile ? (
            <>
              {/* Profile Header */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-red-100 text-red-600 text-2xl font-bold">
                        {profile.vorname.charAt(0)}
                        {profile.nachname.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {profile.vorname} {profile.nachname}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={
                            profile.status === "AKTIV"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {profile.status}
                        </Badge>
                        {profile.produkte.map((product) => (
                          <Badge
                            key={product}
                            variant="outline"
                            className="border-red-200 text-red-700"
                          >
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Kontaktdaten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.telefon && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span>{profile.telefon}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Membership Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Mitgliedschaft</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Mitglied seit</p>
                      <p className="font-medium">
                        {new Date(profile.membershipStart).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Produkte</p>
                      <p className="font-medium">{profile.produkte.join(", ")}</p>
                    </div>
                  </div>
                  {profile.assignedCoach && (
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Dein Coach</p>
                        <p className="font-medium">
                          {profile.assignedCoach.vorname} {profile.assignedCoach.nachname}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Onboarding</p>
                      <p className="font-medium">
                        {profile.onboardingCompleted ? (
                          <span className="text-green-600">✓ Abgeschlossen</span>
                        ) : (
                          <span className="text-orange-600">Ausstehend</span>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">KPI-Tracking</p>
                      <p className="font-medium">
                        {profile.kpiTrackingActive ? (
                          <span className="text-green-600">✓ Aktiv</span>
                        ) : (
                          <span className="text-orange-600">Nicht eingerichtet</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">Profil konnte nicht geladen werden</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
