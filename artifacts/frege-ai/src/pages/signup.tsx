import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Sprout, AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-green-500"];

  const validate = () => {
    if (!name.trim() || name.trim().length < 2) return "Full name must be at least 2 characters";
    if (!email.trim()) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    if (!phone.trim()) return "Phone number is required";
    if (!/^\+?[\d\s\-]{7,15}$/.test(phone.trim())) return "Please enter a valid phone number";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError("");
    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), phone.trim(), password);
      setLocation("/home");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A8A] to-[#16A34A] flex flex-col px-6 py-10 max-w-[480px] mx-auto">
      <button
        onClick={() => setLocation("/login")}
        className="flex items-center gap-1.5 text-white/80 hover:text-white mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Login</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Create Account</h1>
          <p className="text-white/70 text-sm">Join thousands of farmers on FREGE AI</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name</label>
              <Input
                type="text"
                placeholder="Aminu Musa"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                className="h-11 rounded-xl border-gray-200 focus:border-[#16A34A] text-sm"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="h-11 rounded-xl border-gray-200 focus:border-[#16A34A] text-sm"
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone Number</label>
              <Input
                type="tel"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(""); }}
                className="h-11 rounded-xl border-gray-200 focus:border-[#16A34A] text-sm"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="h-11 rounded-xl border-gray-200 focus:border-[#16A34A] text-sm pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColor[passwordStrength] : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold ${passwordStrength === 1 ? "text-red-500" : passwordStrength === 2 ? "text-amber-500" : "text-green-500"}`}>
                    {strengthLabel[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  className="h-11 rounded-xl border-gray-200 focus:border-[#16A34A] text-sm pr-11"
                  autoComplete="new-password"
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl text-base mt-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating account…</>
              ) : "Create Account"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="font-bold text-[#1E3A8A] hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
