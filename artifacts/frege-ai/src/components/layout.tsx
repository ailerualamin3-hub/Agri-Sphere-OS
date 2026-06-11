import React from "react";
import { Link, useLocation } from "wouter";
import { Home, ScanLine, Bot, Users, BarChart3, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/scan", icon: ScanLine, label: "Scan" },
  { href: "/farmgpt", icon: Bot, label: "FarmGPT" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/market", icon: BarChart3, label: "Market" },
  { href: "/profile", icon: UserCircle, label: "Profile" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="mx-auto max-w-[480px] min-h-screen bg-background relative shadow-2xl flex flex-col">
      <main className="flex-1 overflow-y-auto pb-[68px]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50 px-1 pt-1 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 relative",
                  isActive ? "text-[#16A34A]" : "text-gray-400"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#16A34A] rounded-full" />
                )}
                <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[9px] font-semibold tracking-tight", isActive ? "text-[#16A34A]" : "text-gray-400")}>
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
