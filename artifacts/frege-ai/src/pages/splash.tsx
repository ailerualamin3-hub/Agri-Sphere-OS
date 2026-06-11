import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Splash() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/home");
    }, 2500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary relative overflow-hidden max-w-[480px] mx-auto">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-32 h-32 mb-6 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <defs>
              <linearGradient id="grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#16A34A" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
            {/* Abstract Bird/Leaf/Circuit logo */}
            <path d="M50 90 C 20 90, 10 50, 10 30 C 30 30, 45 45, 50 60 C 55 45, 70 30, 90 30 C 90 50, 80 90, 50 90 Z" fill="url(#grad)" />
            <circle cx="50" cy="40" r="8" fill="#FBBF24" />
            <path d="M50 40 L50 20 M30 30 L50 20 L70 30" stroke="#FBBF24" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-4xl font-bold tracking-tight text-white mb-2 font-serif"
        >
          FREGE <span className="text-accent">AI</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-primary-foreground/80 text-sm font-medium tracking-wide uppercase"
        >
          The Operating System for African Agriculture
        </motion.p>
      </motion.div>
    </div>
  );
}
