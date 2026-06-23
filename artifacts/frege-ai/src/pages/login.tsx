import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Loader2, Sprout, AlertCircle,
  Smartphone, Mail, ChevronRight, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";

type AuthTab = "email" | "phone";
type PhoneStep = "number" | "otp" | "name";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [tab, setTab] = useState<AuthTab>("email");

  // ── Email/password state ──────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // ── Phone OTP state ───────────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("number");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [shownOtp, setShownOtp] = useState("");
  const [shownOtpNote, setShownOtpNote] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // ── Email login ───────────────────────────────────────────────────────────
  const validateEmail = () => {
    if (!email.trim()) return "Email address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail();
    if (err) { setEmailError(err); return; }
    setEmailError("");
    setEmailLoading(true);
    try {
      await login(email.trim(), password);
      setLocation("/home");
    } catch (err: any) {
      setEmailError(err.message || "Login failed. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Phone OTP ─────────────────────────────────────────────────────────────
  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = phone.trim().replace(/\s+/g, "");
    if (!cleaned) { setPhoneError("Phone number is required"); return; }
    if (!/^\+?[\d\s\-]{7,15}$/.test(phone.trim())) { setPhoneError("Enter a valid phone number (e.g. +234 803 000 0000)"); return; }
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const res = await sendPhoneOtp(cleaned);
      setShownOtp(res.otp);
      setShownOtpNote(res.note || "");
      setIsNewUser(res.isNewUser);
      setPhoneStep("otp");
      startCountdown();
    } catch (err: any) {
      setPhoneError(err.message || "Could not send OTP. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) { setPhoneError("Enter the 6-digit code"); return; }
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const result = await verifyPhoneOtp(phone.trim().replace(/\s+/g, ""), otp.trim());
      if (result.isNewUser) {
        setPhoneStep("name");
        setPhoneLoading(false);
      } else {
        setLocation("/home");
      }
    } catch (err: any) {
      setPhoneError(err.message || "Incorrect code. Please try again.");
      setPhoneLoading(false);
    }
  };

  const handleCompleteName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName.trim() || farmerName.trim().length < 2) { setPhoneError("Please enter your name"); return; }
    setPhoneError("");
    setPhoneLoading(true);
    try {
      await verifyPhoneOtp(phone.trim().replace(/\s+/g, ""), otp.trim(), farmerName.trim());
      setLocation("/home");
    } catch (err: any) {
      setPhoneError(err.message || "Failed. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A8A] to-[#16A34A] flex flex-col items-center justify-center px-5 py-10 max-w-[480px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full"
      >
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Welcome back</h1>
          <p className="text-white/70 text-sm">Sign in to your FREGE AI account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            {([
              { id: "email" as AuthTab, label: "Email", Icon: Mail },
              { id: "phone" as AuthTab, label: "Phone OTP", Icon: Smartphone },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setEmailError(""); setPhoneError(""); setPhoneStep("number"); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors border-b-2",
                  tab === id
                    ? "text-[#1E3A8A] border-[#1E3A8A]"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">

              {/* ── EMAIL / PASSWORD TAB ─────────────────────────────────── */}
              {tab === "email" && (
                <motion.form
                  key="email"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleEmailLogin}
                  className="space-y-4"
                >
                  {emailError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">{emailError}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Email Address</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      className="h-12 rounded-xl border-gray-200 text-sm"
                      autoComplete="email"
                      autoCapitalize="none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setEmailError(""); }}
                        className="h-12 rounded-xl border-gray-200 text-sm pr-11"
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <button type="button" onClick={() => setLocation("/forgot-password")}
                      className="text-xs font-semibold text-[#16A34A] hover:underline">
                      Forgot Password?
                    </button>
                  </div>
                  <Button type="submit" disabled={emailLoading}
                    className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl text-base">
                    {emailLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in…</>
                      : "Sign In"}
                  </Button>
                </motion.form>
              )}

              {/* ── PHONE OTP TAB ────────────────────────────────────────── */}
              {tab === "phone" && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">

                    {/* Step 1: enter phone */}
                    {phoneStep === "number" && (
                      <motion.form key="step-number" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={handleSendOtp} className="space-y-4">
                        <div className="text-center mb-2">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Smartphone className="w-6 h-6 text-[#1E3A8A]" />
                          </div>
                          <p className="text-sm text-gray-500">Enter your phone number and we'll send a one-time code</p>
                        </div>
                        {phoneError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-600">{phoneError}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone Number</label>
                          <Input
                            type="tel"
                            placeholder="+234 803 000 0000"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                            className="h-12 rounded-xl border-gray-200 text-sm"
                            autoComplete="tel"
                          />
                        </div>
                        <Button type="submit" disabled={phoneLoading}
                          className="w-full h-12 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl">
                          {phoneLoading
                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending code…</>
                            : <><span>Get Code</span><ChevronRight className="w-4 h-4 ml-1" /></>}
                        </Button>
                      </motion.form>
                    )}

                    {/* Step 2: enter OTP */}
                    {phoneStep === "otp" && (
                      <motion.form key="step-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="text-center mb-1">
                          <p className="text-sm text-gray-600">Code sent to <strong>{phone}</strong></p>
                        </div>

                        {/* Simulated SMS display */}
                        {shownOtp && (
                          <div className="bg-[#1E3A8A]/5 border border-[#1E3A8A]/20 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Smartphone className="w-3.5 h-3.5 text-[#1E3A8A]" />
                              <span className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-wide">SMS from FREGE AI</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1.5">{shownOtpNote}</p>
                            <p className="text-2xl font-black text-[#1E3A8A] tracking-[0.25em]">{shownOtp}</p>
                          </div>
                        )}

                        {phoneError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-600">{phoneError}</p>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Enter 6-digit Code</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setPhoneError(""); }}
                            className="h-12 rounded-xl border-gray-200 text-center text-xl font-black tracking-widest"
                            maxLength={6}
                            autoComplete="one-time-code"
                          />
                        </div>

                        <Button type="submit" disabled={phoneLoading || otp.length !== 6}
                          className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl">
                          {phoneLoading
                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</>
                            : "Verify & Sign In"}
                        </Button>

                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => { setPhoneStep("number"); setPhoneError(""); setOtp(""); }}
                            className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                            ← Change number
                          </button>
                          {countdown > 0 ? (
                            <span className="text-xs text-gray-400">Resend in {countdown}s</span>
                          ) : (
                            <button type="button" disabled={phoneLoading} onClick={() => handleSendOtp()}
                              className="text-xs text-[#1E3A8A] font-semibold hover:underline flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> Resend code
                            </button>
                          )}
                        </div>
                      </motion.form>
                    )}

                    {/* Step 3: name (new users only) */}
                    {phoneStep === "name" && (
                      <motion.form key="step-name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={handleCompleteName} className="space-y-4">
                        <div className="text-center mb-2">
                          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Sprout className="w-6 h-6 text-[#16A34A]" />
                          </div>
                          <h3 className="font-black text-gray-900 mb-0.5">Almost there!</h3>
                          <p className="text-sm text-gray-500">What should we call you?</p>
                        </div>
                        {phoneError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-600">{phoneError}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Your Name</label>
                          <Input
                            type="text"
                            placeholder="Aminu Musa"
                            value={farmerName}
                            onChange={(e) => { setFarmerName(e.target.value); setPhoneError(""); }}
                            className="h-12 rounded-xl border-gray-200 text-sm"
                            autoComplete="name"
                            autoFocus
                          />
                        </div>
                        <Button type="submit" disabled={phoneLoading}
                          className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl">
                          {phoneLoading
                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account…</>
                            : "Start Farming with FREGE AI"}
                        </Button>
                      </motion.form>
                    )}

                  </AnimatePresence>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Footer link */}
            <div className="mt-5 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{" "}
                <button onClick={() => setLocation("/signup")} className="font-bold text-[#1E3A8A] hover:underline">
                  Create Account
                </button>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
