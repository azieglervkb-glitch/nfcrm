"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MemberLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await fetch("/api/member/auth/logout", { method: "POST" });
      router.push("/member/login");
      router.refresh();
    };

    logout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Logging out...</p>
    </div>
  );
}
