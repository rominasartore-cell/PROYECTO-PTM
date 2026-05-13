"use client";

import { AdminLogin } from "@/components/AdminLogin";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "ptm-admin-token";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);

    if (token) {
      router.replace("/admin/dashboard");
      return;
    }

    setIsCheckingSession(false);
  }, [router]);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-xl">
          Cargando acceso administrativo...
        </div>
      </main>
    );
  }

  return <AdminLogin />;
}
