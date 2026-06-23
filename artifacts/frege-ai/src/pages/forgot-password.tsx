import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Mail, KeyRound, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth";

type Step = "email" | "code" | "done";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [shownCode, setShownCode] = useState("");
  const [shownNote, setShownNote] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res.resetCode) {
        setShownCode(res.resetCode);
        setShownNote(res.note || "");
      }
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Failed to process request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) { setError("Enter the reset code"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setIsLoading(true);
    try {
      await resetPassword(email.trim(), resetCode.trim(), newPassword);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A8A] to-[#16A34A] flex flex-col px-6 py-10 max-w-[480px] mx-auto">
      {step !== "done" && (
        <button
          onClick={() => step === "email" ? setLocation("/login") : setStep("email")}
          className="flex items-center gap-1.5 text-white/80 hover:text-white mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mt-4"
      >
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                    <Mail className="w-7 h-7 text-[#1E3A8A]" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">Forgot Password?</h2>
                  <p className="text-sm text-gray-500 max-w-[260px]">Enter your email address and we'll send you a reset code.</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Email Address</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      className="h-12 rounded-xl border-gray-200 text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</> : "Send Reset Code"}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "code" && (
              <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
                    <KeyRound className="w-7 h-7 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">Enter Reset Code</h2>
                  <p className="text-sm text-gray-500">We sent a code to <strong>{email}</strong></p>
                </div>

                {shownCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-center">
                    <p className="text-xs text-amber-700 font-medium mb-1">{shownNote}</p>
                    <p className="text-2xl font-black text-amber-800 tracking-widest">{shownCode}</p>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Reset Code</label>
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={resetCode}
                      onChange={(e) => { setResetCode(e.target.value); setError(""); }}
                      className="h-11 rounded-xl border-gray-200 text-sm text-center tracking-widest font-mono"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">New Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                        className="h-11 rounded-xl border-gray-200 text-sm pr-11"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Confirm Password</label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      className="h-11 rounded-xl border-gray-200 text-sm"
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Resetting…</> : "Reset Password"}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Password Reset!</h2>
                <p className="text-sm text-gray-500 mb-6">Your password has been updated. You are now signed in.</p>
                <Button onClick={() => setLocation("/home")} className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl">
                  Go to Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-white/60 text-sm mt-5">
          Remembered your password?{" "}
          <button onClick={() => setLocation("/login")} className="text-white font-bold hover:underline">Sign In</button>
        </p>
      </motion.div>
    </div>
  );
}
