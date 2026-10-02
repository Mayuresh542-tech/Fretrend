"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Film,
  TrendingUp,
  Lightbulb,
  FileText,
  Mic,
  Video,
  Image as ImageIcon,
  Type,
  LayoutTemplate,
  Settings,
  CreditCard,
  ShieldAlert,
  Share2,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { isAdminEmail } from "../lib/admin";
import {
  overlayVariants,
  sidebarDrawerVariants,
} from "../lib/motion";

export type ActiveNav =
  | "dashboard"
  | "create"
  | "projects"
  | "editor"
  | "trends"
  | "raw-footage"
  | "typography"
  | "ideas"
  | "script"
  | "voice"
  | "broll"
  | "thumbnails"
  | "captions"
  | "templates"
  | "settings"
  | "billing"
  | "affiliates"
  | "admin"
  | string;

export interface SidebarProps {
  active?: ActiveNav;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onCreateClick?: () => void;
  onBrandKitClick?: () => void;
  onTabChange?: (tab: string) => void;
}

interface NavItemDef {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  onClick?: () => void;
}

export default function Sidebar({
  active,
  mobileOpen = false,
  onMobileClose,
  onCreateClick,
  onTabChange,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("Free Plan");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!cancelled && data.session?.user) {
        const email = data.session.user.email ?? null;
        setUserEmail(email);
        setIsAdmin(isAdminEmail(email));

        // Fetch plan
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

  // Determine current active item based on prop or pathname
  const currentNav = (active || (() => {
    if (pathname.startsWith("/editor")) return "editor";
    if (pathname.startsWith("/create")) return "create";
    if (pathname.startsWith("/projects")) return "projects";
    if (pathname.startsWith("/trends")) return "trends";
    if (pathname.startsWith("/raw-footage")) return "raw-footage";
    if (pathname.startsWith("/typography")) return "typography";
    if (pathname.startsWith("/ideas")) return "ideas";
    if (pathname.startsWith("/script")) return "script";
    if (pathname.startsWith("/voice")) return "voice";
    if (pathname.startsWith("/broll")) return "broll";
    if (pathname.startsWith("/thumbnails")) return "thumbnails";
    if (pathname.startsWith("/captions")) return "captions";
    if (pathname.startsWith("/templates")) return "templates";
    if (pathname.startsWith("/settings/billing") || pathname.startsWith("/upgrade")) return "billing";
    if (pathname.startsWith("/settings")) return "settings";
    if (pathname.startsWith("/affiliates")) return "affiliates";
    if (pathname.startsWith("/admin")) return "admin";
    return "dashboard";
  })()).toLowerCase();

  const mainNavItems: NavItemDef[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "create",
      label: "Create Video",
      href: "/create",
      icon: Sparkles,
    },
    {
      id: "projects",
      label: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      id: "editor",
      label: "Video Editor",
      href: "/editor",
      icon: Film,
    },
  ];

  const creationTools: NavItemDef[] = [
    {
      id: "trends",
      label: "Trend Finder",
      href: "/trends",
      icon: TrendingUp,
    },
    {
      id: "raw-footage",
      label: "Raw Footage Studio",
      href: "/raw-footage",
      icon: Video,
    },
    {
      id: "typography",
      label: "Typography Video",
      href: "/typography",
      icon: Type,
    },
    {
      id: "ideas",
      label: "Content Ideas",
      href: "/ideas",
      icon: Lightbulb,
    },
    {
      id: "script",
      label: "Script Writer",
      href: "/script",
      icon: FileText,
    },
    {
      id: "voice",
      label: "AI Voice Studio",
      href: "/voice",
      icon: Mic,
    },
    {
      id: "broll",
      label: "B-Roll Cutaways",
      href: "/broll",
      icon: Film,
    },
    {
      id: "thumbnails",
      label: "Thumbnail Studio",
      href: "/thumbnails",
      icon: ImageIcon,
    },
    {
      id: "captions",
      label: "Captions Studio",
      href: "/captions",
      icon: Type,
    },
  ];

  const secondaryNavItems: NavItemDef[] = [
    {
      id: "templates",
      label: "Templates",
      href: "/templates",
      icon: LayoutTemplate,
    },
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      id: "billing",
      label: "Billing",
      href: "/settings/billing",
      icon: CreditCard,
    },
    {
      id: "affiliates",
      label: "Affiliates",
      href: "/affiliates",
      icon: Share2,
    },
  ];

  if (isAdmin) {
    secondaryNavItems.push({
      id: "admin",
      label: "Admin",
      href: "/admin",
      icon: ShieldAlert,
    });
  }

  const displayName = userEmail
    ? userEmail.split("@")[0].charAt(0).toUpperCase() + userEmail.split("@")[0].slice(1)
    : "Alex Carter";

  const sidebarContent = (
    <aside className="w-60 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col justify-between p-3.5 select-none z-30">
      {/* Top: Brand Header & Scrollable Navigations */}
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* Veelox Brand Header */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1 group">
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shadow-xs">
            <span className="text-white text-xs font-bold tracking-wider">V</span>
          </div>
          <span className="font-heading text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            Veelox
          </span>
        </Link>

        {/* Primary Navigation */}
        <nav className="space-y-0.5">
          {mainNavItems.map((item) => {
            const isActive = currentNav === item.id;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                  onTabChange?.(item.id);
                  onMobileClose?.();
                }}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-150 ${
                  isActive
                    ? "bg-slate-900 text-white font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Modular Creation Tools Section */}
        <div className="space-y-1">
          <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Create Tools
          </div>
          <nav className="space-y-0.5">
            {creationTools.map((item) => {
              const isActive = currentNav === item.id;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    onTabChange?.(item.id);
                    onMobileClose?.();
                  }}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-150 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 my-1" />

        {/* Secondary Navigation */}
        <nav className="space-y-0.5">
          {secondaryNavItems.map((item) => {
            const isActive = currentNav === item.id;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  onTabChange?.(item.id);
                  onMobileClose?.();
                }}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-150 ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Profile */}
      <div className="pt-2 border-t border-slate-100">
        <Link
          href="/settings/billing"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs overflow-hidden shrink-0">
            {displayName.charAt(0)}
          </div>
          <div className="truncate flex-1 min-w-0">
            <span className="font-medium text-slate-800 text-xs truncate block leading-tight group-hover:text-slate-900">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
              {userPlan}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (w-60) */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer with Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onMobileClose}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              variants={sidebarDrawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-10 h-full shadow-xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
