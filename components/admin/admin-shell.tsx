"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, LineChart, Settings, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LogoutButton } from "@/components/shared/logout-button";

const links = [
  { href: "/admin/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/workers", label: "العمال", icon: Users },
  { href: "/admin/shifts", label: "المناوبات", icon: Wallet },
  { href: "/admin/reports", label: "التقارير", icon: LineChart },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  { href: "/admin/settings/telegram", label: "Telegram", icon: Bell }
];

export function AdminShell({
  adminName,
  children
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] bg-slate-950 p-4 text-white lg:block">
          <div className="mb-8 px-3 pt-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
            <h1 className="mt-3 text-2xl font-bold">لوحة المسؤول</h1>
            <p className="mt-2 text-sm text-slate-400">{adminName}</p>
          </div>
          <nav className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                    active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8">
            <LogoutButton redirectTo="/admin/login" />
          </div>
        </aside>
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
