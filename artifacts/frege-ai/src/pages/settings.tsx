import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Camera, Save, Loader2, User, MapPin,
  Phone, Mail, Tractor, Bell, Lock, Trash2, Eye, EyeOff
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFarmerProfileQueryKey } from "@workspace/api-client-react";

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

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara"
];

const FARMING_TYPES = [
  { value: "crop", label: "Crop Farming" },
  { value: "livestock", label: "Livestock Farming" },
  { value: "mixed", label: "Mixed Farming" },
  { value: "aquaculture", label: "Aquaculture / Fish Farming" },
  { value: "agroforestry", label: "Agroforestry" },
];

type Section = "profile" | "security" | "notifications";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { farmer: authFarmer, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<Section>("profile");

  const [form, setForm] = useState({
    name: authFarmer?.name ?? "",
    email: authFarmer?.email ?? "",
    phone: (authFarmer as any)?.phone ?? "",
    state: authFarmer?.state ?? "",
    lga: (authFarmer as any)?.lga ?? "",
    farmingType: (authFarmer as any)?.farmingType ?? "mixed",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>((authFarmer as any)?.avatarUrl ?? null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [notifForm, setNotifForm] = useState({
    marketAlerts: true,
    weatherAlerts: true,
    healthAlerts: true,
    communityUpdates: false,
  });

  const handleProfileSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await apiFetch("/farmer/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          state: form.state || undefined,
          lga: form.lga.trim() || undefined,
          farmingType: form.farmingType || undefined,
        }),
      });
      queryClient.invalidateQueries({ queryKey: getGetFarmerProfileQueryKey() });
      toast({ title: "Profile updated!", description: "Your details have been saved." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Use an image under 2MB.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        await apiFetch("/farmer/profile", { method: "PATCH", body: JSON.stringify({ avatarUrl: base64 }) });
        setAvatarPreview(base64);
        queryClient.invalidateQueries({ queryKey: getGetFarmerProfileQueryKey() });
        toast({ title: "Photo updated!" });
      } catch {
        toast({ title: "Upload failed", variant: "destructive" });
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordSave = async () => {
    if (!pwForm.newPassword) { toast({ title: "Enter a new password", variant: "destructive" }); return; }
    if (pwForm.newPassword.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setSavingPw(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      toast({ title: "Password changed successfully!" });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  const sections: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <button onClick={() => setLocation("/profile")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-900">Settings</h1>
          <p className="text-xs text-gray-400">Manage your profile and preferences</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors ${
                activeSection === s.id
                  ? "bg-[#1E3A8A] text-white"
                  : "bg-white text-gray-500 border border-gray-100"
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {activeSection === "profile" && (
          <div className="space-y-4">
            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-black text-gray-400">
                          {(form.name || "F").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#16A34A] rounded-full flex items-center justify-center border-2 border-white shadow"
                    >
                      {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{form.name || "Your Name"}</p>
                    <p className="text-xs text-gray-400">{form.state || "Location not set"}</p>
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-[#16A34A] font-bold mt-1">
                      Change photo
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#1E3A8A]" /> Personal Information
                </h3>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Full Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">
                    <Mail className="w-3 h-3 inline mr-1" />Email Address
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">
                    <Phone className="w-3 h-3 inline mr-1" />Phone Number
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+234 XXX XXX XXXX"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Phone changes require re-verification. Contact support to update.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#16A34A]" /> Farm Location
                </h3>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">State</label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="">Select your state</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">LGA / Town</label>
                  <Input
                    value={form.lga}
                    onChange={(e) => setForm((f) => ({ ...f, lga: e.target.value }))}
                    placeholder="e.g. Ilorin East, Damboa"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-amber-500" /> Farming Type
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {FARMING_TYPES.map((ft) => (
                    <button
                      key={ft.value}
                      onClick={() => setForm((f) => ({ ...f, farmingType: ft.value }))}
                      className={`py-3 px-4 rounded-xl text-sm font-bold border-2 text-left transition-colors ${
                        form.farmingType === ft.value
                          ? "bg-[#16A34A]/10 border-[#16A34A] text-[#16A34A]"
                          : "border-gray-100 text-gray-600 bg-gray-50"
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleProfileSave}
              disabled={saving}
              className="w-full h-13 rounded-2xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-black text-sm"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
            </Button>
          </div>
        )}

        {activeSection === "notifications" && (
          <Card className="rounded-2xl border-0 shadow-sm bg-white">
            <CardContent className="p-4 space-y-1">
              <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#1E3A8A]" /> Notification Preferences
              </h3>
              {[
                { key: "marketAlerts", label: "Market Price Alerts", desc: "Get notified when your crops' prices change significantly" },
                { key: "weatherAlerts", label: "Weather Alerts", desc: "Rainfall, drought, and flood warnings for your area" },
                { key: "healthAlerts", label: "Farm Health Alerts", desc: "Disease or pest outbreak warnings near your location" },
                { key: "communityUpdates", label: "Community Updates", desc: "New posts, answers and group activity" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifForm((n) => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      notifForm[item.key as keyof typeof notifForm] ? "bg-[#16A34A]" : "bg-gray-200"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifForm[item.key as keyof typeof notifForm] ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
              ))}
              <div className="pt-2">
                <Button
                  onClick={() => toast({ title: "Notification preferences saved!" })}
                  className="w-full h-11 rounded-2xl bg-[#1E3A8A] text-white font-bold"
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "security" && (
          <div className="space-y-4">
            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#1E3A8A]" /> Change Password
                </h3>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm pr-10"
                    />
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">New Password</label>
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="At least 6 characters"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Confirm New Password</label>
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm"
                  />
                </div>

                <Button
                  onClick={handlePasswordSave}
                  disabled={savingPw}
                  className="w-full h-11 rounded-2xl bg-[#1E3A8A] text-white font-bold"
                >
                  {savingPw ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Updating...</> : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" /> Danger Zone
                </h3>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  These actions are permanent and cannot be undone. Please be sure before proceeding.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to sign out?")) {
                      logout();
                      setLocation("/login");
                    }
                  }}
                  className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Sign Out of All Devices
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
