import React from "react";
import { Link, useLocation } from "wouter";
import { Home, ScanLine, Bot, Tractor, UserCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/diagnose", icon: ScanLine, label: "Farm Check" },
  { href: "/farmgpt", icon: Bot, label: "FREGE AI" },
  { href: "/farm", icon: Tractor, label: "Farm" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/profile", icon: UserCircle, label: "Profile" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="mx-auto max-w-[480px] min-h-screen bg-background relative shadow-2xl flex flex-col">
      <main className="flex-1 overflow-y-auto pb-[64px]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50 px-0 pt-1 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-13 rounded-xl transition-all duration-200 relative py-1",
                  isActive ? "text-[#16A34A]" : "text-gray-400"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#16A34A] rounded-full" />
                )}
                <Icon className="w-4.5 h-4.5 mb-0.5" size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[8px] font-semibold tracking-tight leading-none", isActive ? "text-[#16A34A]" : "text-gray-400")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
