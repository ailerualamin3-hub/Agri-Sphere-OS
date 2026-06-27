import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, MapPin, Camera, ChevronRight,
  LogOut, Settings, CreditCard, Sprout, Star,
  Phone, Mail, Tractor, Users, ShieldCheck, Edit2, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetFarmerProfile,
  useGetFarms,
  useGetCrops,
  useGetLivestock,
  getGetFarmerProfileQueryKey,
  getGetFarmsQueryKey,
  getGetCropsQueryKey,
  getGetLivestockQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const TOKEN_KEY = "frege_auth_token";
async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getExperienceLevel(joinedAt: string): { label: string; color: string; desc: string } {
  const months = (Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months < 3) return { label: "New Farmer", color: "bg-blue-100 text-blue-700", desc: "Just getting started" };
  if (months < 12) return { label: "Growing Farmer", color: "bg-amber-100 text-amber-700", desc: "Building experience" };
  return { label: "Experienced Farmer", color: "bg-green-100 text-[#16A34A]", desc: "Trusted on FregeOS" };
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { farmer: authFarmer, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { data: profile, isLoading } = useGetFarmerProfile({ query: { queryKey: getGetFarmerProfileQueryKey() } });
  const { data: farms } = useGetFarms({ query: { queryKey: getGetFarmsQueryKey() } });
  const { data: crops } = useGetCrops({ query: { queryKey: getGetCropsQueryKey() } });
  const { data: livestock } = useGetLivestock({ query: { queryKey: getGetLivestockQueryKey() } });

  const joinedAt = (profile as any)?.joinedAt ?? new Date().toISOString();
  const experience = getExperienceLevel(joinedAt);
  const joinedDate = new Date(joinedAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  const farmerId = profile?.id ?? 1;
  const farmerIdDisplay = `FRG-${String(farmerId).padStart(6, "0")}`;
  const avatarUrl = (profile as any)?.avatarUrl;
  const isPro = ((profile as any)?.credits ?? 0) > 0;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Image too large", description: "Please use an image under 2MB.", variant: "destructive" }); return; }
    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        await apiFetch("/farmer/profile", { method: "PATCH", body: JSON.stringify({ avatarUrl: base64 }) });
        queryClient.invalidateQueries({ queryKey: getGetFarmerProfileQueryKey() });
        toast({ title: "Photo updated!", description: "Your profile picture has been saved." });
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Upload failed", description: "Could not save photo. Try again.", variant: "destructive" });
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => { logout(); setLocation("/login"); };

  const menuItems = [
    { icon: Edit2, label: "Edit My Details", desc: "Change name, phone, location, farming type", action: () => setLocation("/settings") },
    { icon: CreditCard, label: "Upgrade to Pro", desc: isPro ? "You have Pro access" : "Unlock unlimited features", action: () => setLocation("/payment"), highlight: !isPro },
    { icon: Tractor, label: "My Farms", desc: `${farms?.length ?? 0} farm(s) registered`, action: () => setLocation("/farm") },
    { icon: Settings, label: "Settings & Notifications", desc: "Manage preferences and alerts", action: () => setLocation("/settings") },
    { icon: ShieldCheck, label: "Help & Support", desc: "WhatsApp: 0800-FREGE-AI", action: () => toast({ title: "Support", description: "WhatsApp 0800-FREGE-AI for help." }) },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A] to-blue-700 px-4 pt-12 pb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">
                  {(profile?.name ?? authFarmer?.name ?? "F").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#16A34A] rounded-full flex items-center justify-center border-2 border-white shadow-lg"
            >
              {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name & details */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 bg-white/20 rounded" />
                <Skeleton className="h-3 w-24 bg-white/20 rounded" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-white mb-0.5 truncate">{profile?.name ?? authFarmer?.name}</h1>
                <p className="text-blue-200 text-xs font-mono font-bold mb-1">{farmerIdDisplay}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${experience.color}`}>
                    <Star className="w-2.5 h-2.5" /> {experience.label}
                  </span>
                  {(profile?.verificationStatus ?? "verified") === "verified" && (
                    <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {isPro && (
                    <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Sprout className="w-2.5 h-2.5" /> Pro
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ID Card info */}
        <div className="mt-4 bg-white/10 rounded-2xl p-3 grid grid-cols-2 gap-y-2 gap-x-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span className="text-blue-100 text-xs truncate">{profile?.state ?? authFarmer?.state ?? "—"}, Nigeria</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span className="text-blue-100 text-xs truncate">{(profile as any)?.phone ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span className="text-blue-100 text-xs truncate">{profile?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tractor className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span className="text-blue-100 text-xs capitalize truncate">{(profile as any)?.farmingType ?? "Mixed"} farming</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Farms", value: farms?.length ?? 0, icon: Tractor, color: "#16A34A" },
            { label: "Crops", value: crops?.length ?? 0, icon: Sprout, color: "#1E3A8A" },
            { label: "Animals", value: livestock?.length ?? 0, icon: Users, color: "#FBBF24" },
          ].map((s) => (
            <Card key={s.label} className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-3 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-400 font-semibold">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Member since */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">FregeOS Member</p>
              <p className="text-xs text-gray-400">Joined {joinedDate} · {experience.desc}</p>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade banner (if not pro) */}
        {!isPro && (
          <button onClick={() => setLocation("/payment")} className="w-full">
            <Card className="rounded-2xl border-0 bg-gradient-to-r from-[#1E3A8A] to-[#16A34A] shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sprout className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-white">Upgrade to Pro — from ₦1,500/month</p>
                  <p className="text-xs text-blue-100">Unlimited FarmGPT · Government grants · No ads</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white shrink-0" />
              </CardContent>
            </Card>
          </button>
        )}

        {/* Menu */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${i < menuItems.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.highlight ? "bg-[#16A34A]" : "bg-gray-100"}`}>
                <item.icon className={`w-4 h-4 ${item.highlight ? "text-white" : "text-gray-600"}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-bold ${item.highlight ? "text-[#16A34A]" : "text-gray-900"}`}>{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          ))}
        </Card>

        {/* Sign Out */}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 rounded-2xl border border-red-100">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-sm font-bold text-red-500">Sign Out</p>
        </button>

        <p className="text-center text-[10px] text-gray-300 pb-2">FREGE AI v1.0 · FregeOS for African Agriculture</p>
      </div>
    </div>
  );
}
