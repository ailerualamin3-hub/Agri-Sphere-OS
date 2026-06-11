import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Bot, Leaf, Users, ShoppingCart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/farmgpt", icon: Bot, label: "FarmGPT" },
  { href: "/farm", icon: Leaf, label: "Farm" },
  { href: "/farmconnect", icon: Users, label: "Connect" },
  { href: "/market", icon: ShoppingCart, label: "Market" },
  { href: "/neuroscore", icon: Star, label: "Score" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="mx-auto max-w-[480px] min-h-screen bg-background relative pb-[72px] shadow-2xl overflow-hidden flex flex-col">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-[480px] bg-card/80 backdrop-blur-xl border-t border-border/50 z-50 px-2 pb-safe pt-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("w-6 h-6 mb-1", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
