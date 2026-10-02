"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar, { ActiveNav } from "./Sidebar";
import TopHeader from "./dashboard/TopHeader";
import { useAlertCount } from "../lib/alerts";
import { supabase } from "../lib/supabase";

interface StudioShellProps {
  active: ActiveNav | string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  onCreateClick?: () => void;
  onBrandKitClick?: () => void;
}

export default function StudioShell({
  active,
  children,
  onCreateClick,
}: StudioShellProps) {
  const router = useRouter();
  const alertCount = useAlertCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("Free Plan");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!cancelled && data.session?.user) {
        setUserEmail(data.session.user.email ?? null);
        try {
          const res = await fetch("/api/billing", {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          if (res.ok) {
            const bData = await res.json();
            if (!cancelled && bData?.plan?.name) {
              setUserPlan(`${bData.plan.name} Plan`);
            }
          }
        } catch {
          // ignore
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const userName = userEmail
    ? userEmail.split("@")[0].charAt(0).toUpperCase() + userEmail.split("@")[0].slice(1)
    : "Alex Carter";

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#0F172A] font-sans overflow-hidden">
      {/* 1. Unified Master Sidebar (240px) */}
      <Sidebar
        active={active}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onCreateClick={onCreateClick || (() => router.push("/create"))}
      />

      {/* 2. Main Content Stage + Top Header */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#FAFAFA]">
        <TopHeader
          onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
          alertCount={alertCount}
          userName={userName}
          userRole={userPlan}
        />

        {/* Global Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 lg:p-10 relative">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
