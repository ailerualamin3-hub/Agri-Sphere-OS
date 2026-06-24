import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  ShieldCheck, TrendingUp, CheckCircle2, Award, Landmark,
  CreditCard, ChevronRight, BarChart2,
  FileText, Settings, LogOut, Sprout, MessageSquare, ShoppingCart,
  Calendar, Star, Users, Ribbon, BadgeCheck, Wheat, HeartPulse
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetFarmerProfile,
  useGetNeuroScore,
  useGetNeuroScoreBreakdown,
  useGetReadinessScores,
  getGetFarmerProfileQueryKey,
  getGetNeuroScoreQueryKey,
  getGetNeuroScoreBreakdownQueryKey,
  getGetReadinessScoresQueryKey,
} from "@workspace/api-client-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

type ProfileTab = "overview" | "achievements" | "readiness";

const ACHIEVEMENTS = [
  {
    id: 1,
    title: "First Harvest",
    description: "You recorded your first crop harvest",
    icon: Wheat,
    color: "bg-green-50 text-[#16A34A]",
    earned: true,
    earnedAt: "Jan 2026",
  },
  {
    id: 2,
    title: "AI User",
    description: "You used FarmGPT AI helper 5+ times",
    icon: Sprout,
    color: "bg-blue-50 text-[#1E3A8A]",
    earned: true,
    earnedAt: "Mar 2026",
  },
  {
    id: 3,
    title: "Community Star",
    description: "Farmers liked your posts 10+ times",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    earned: true,
    earnedAt: "Apr 2026",
  },
  {
    id: 4,
    title: "Market Seller",
    description: "You listed 3+ products in the market",
    icon: ShoppingCart,
    color: "bg-amber-50 text-amber-600",
    earned: true,
    earnedAt: "May 2026",
  },
  {
    id: 5,
    title: "Season Planner",
    description: "You created your first planting plan",
    icon: Calendar,
    color: "bg-teal-50 text-teal-600",
    earned: false,
    earnedAt: null,
  },
  {
    id: 6,
    title: "Farm Doctor",
    description: "You completed 5 crop or animal checks",
    icon: HeartPulse,
    color: "bg-red-50 text-red-500",
    earned: false,
    earnedAt: null,
  },
  {
    id: 7,
    title: "Verified Farmer",
    description: "Your account is fully verified",
    icon: BadgeCheck,
    color: "bg-yellow-50 text-yellow-600",
    earned: true,
    earnedAt: "Feb 2026",
  },
  {
    id: 8,
    title: "Animal Guardian",
    description: "All your animals stayed healthy above 80%",
    icon: Ribbon,
    color: "bg-orange-50 text-orange-500",
    earned: false,
    earnedAt: null,
  },
  {
    id: 9,
    title: "Record Keeper",
    description: "You kept farm records for 3 months in a row",
    icon: FileText,
    color: "bg-indigo-50 text-indigo-600",
    earned: false,
    earnedAt: null,
  },
  {
    id: 10,
    title: "Community Voice",
    description: "You posted in the community 10+ times",
    icon: MessageSquare,
    color: "bg-pink-50 text-pink-500",
    earned: false,
    earnedAt: null,
  },
];

function InitialsAvatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "from-green-500 to-green-600",
    "from-blue-600 to-blue-700",
    "from-purple-500 to-purple-600",
    "from-amber-500 to-amber-600",
    "from-teal-500 to-teal-600",
    "from-rose-500 to-rose-600",
  ];
  const colorIndex =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const gradient = colors[colorIndex];

  const sizeClass = size === "lg" ? "w-20 h-20 text-2xl" : "w-10 h-10 text-sm";

  return (
    <div
      className={`${sizeClass} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-xl border-2 border-white/30 shrink-0`}
    >
      {initials}
    </div>
  );
}

function levelColor(level: string) {
  const l = (level ?? "").toLowerCase();
  if (l.includes("gold")) return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
  if (l.includes("silver")) return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };
  if (l.includes("bronze")) return { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" };
  return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-400" };
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const handleSignOut = () => {
    logout();
    setLocation("/login");
  };

  const { data: profile, isLoading: isProfileLoading } = useGetFarmerProfile({ query: { queryKey: getGetFarmerProfileQueryKey() } });
  const { data: scoreData, isLoading: isScoreLoading } = useGetNeuroScore({ query: { queryKey: getGetNeuroScoreQueryKey() } });
  const { data: breakdown } = useGetNeuroScoreBreakdown({ query: { queryKey: getGetNeuroScoreBreakdownQueryKey() } });
  const { data: readiness } = useGetReadinessScores({ query: { queryKey: getGetReadinessScoresQueryKey() } });

  const radarData = breakdown
    ? [
        { subject: "Crops", A: breakdown.cropPerformance, fullMark: 100 },
        { subject: "Animals", A: breakdown.livestockPerformance, fullMark: 100 },
        { subject: "Community", A: breakdown.communityReputation, fullMark: 100 },
        { subject: "Activity", A: breakdown.farmActivity, fullMark: 100 },
        { subject: "Market", A: breakdown.marketplaceActivity, fullMark: 100 },
        { subject: "Records", A: breakdown.farmRecords, fullMark: 100 },
      ]
    : [];

  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;
  const memberLevel = scoreData?.level ?? "";
  const lc = levelColor(memberLevel);
  const farmerName = profile?.name ?? "";

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A] to-blue-700 px-4 pt-12 pb-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5">
          <ShieldCheck className="w-48 h-48" />
        </div>

        <div className="flex items-start gap-4 mb-5 relative z-10">
          {isProfileLoading ? (
            <Skeleton className="w-20 h-20 rounded-2xl bg-white/20" />
          ) : farmerName ? (
            <div className="relative">
              <InitialsAvatar name={farmerName} size="lg" />
              {profile?.verificationStatus === "verified" && (
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#16A34A] rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="w-20 h-20 rounded-2xl bg-white/20" />
          )}

          <div className="flex-1 min-w-0">
            {isProfileLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 bg-white/20 rounded" />
                <Skeleton className="h-3 w-24 bg-white/20 rounded" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-white mb-0.5 truncate">{profile?.name}</h1>
                <p className="text-blue-200 text-xs font-medium">ID: FRG-{(profile?.id ?? 1).toString().padStart(6, "0")}</p>
                <p className="text-blue-200 text-xs">{profile?.state}, Nigeria</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {memberLevel && (
                    <span className={`inline-flex items-center gap-1 ${lc.bg} ${lc.text} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${lc.dot}`} />
                      {memberLevel} Farmer
                    </span>
                  )}
                  {profile?.verificationStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-white/10 text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                    {profile?.farmingType} Farmer
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Farm Trust Score */}
        {isScoreLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl bg-white/10" />
        ) : scoreData ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-0.5">Farm Trust Score</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-black text-white leading-none">{scoreData.score}</span>
                  <span className="text-blue-200 text-xs font-semibold pb-1">/ 100</span>
                </div>
                <p className="text-blue-300 text-[10px] mt-0.5">Higher score = better loan & insurance access</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400 text-xs font-bold">+{scoreData.change30Days} pts this month</span>
                </div>
              </div>
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                  <circle
                    cx="40" cy="40" r="30" fill="none"
                    stroke={scoreData.score >= 60 ? "#4ade80" : scoreData.score >= 30 ? "#FBBF24" : "#f87171"}
                    strokeWidth="7"
                    strokeDasharray={188}
                    strokeDashoffset={188 - (188 * scoreData.score) / 100}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white/60" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex mt-4 -mx-4">
          {([
            { id: "overview", label: "My Profile" },
            { id: "achievements", label: "Badges" },
            { id: "readiness", label: "Loan Access" },
          ] as { id: ProfileTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#4ade80] text-white"
                  : "border-transparent text-blue-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 pb-8 space-y-5">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Farm Card */}
            {profile && (
              <section>
                <h2 className="text-base font-bold text-gray-900 mb-3">Your Farm Card</h2>
                <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#16A34A] via-[#FBBF24] to-[#1E3A8A]" />
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Type of Farming", value: profile.farmingType ?? "Mixed", capitalize: true },
                        { label: "State", value: profile.state ?? "—" },
                        { label: "Member Level", value: memberLevel || "Beginner" },
                        { label: "Status", value: profile.verificationStatus ?? "Pending", capitalize: true },
                        { label: "Joined", value: new Date(profile.joinedAt ?? Date.now()).getFullYear().toString() },
                        { label: "LGA", value: profile.lga ?? "—" },
                      ].map((item, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">{item.label}</p>
                          <p className={`text-sm font-bold text-gray-900 ${item.capitalize ? "capitalize" : ""}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Score Breakdown */}
            {radarData.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-gray-900 mb-1">Your Score Breakdown</h2>
                <p className="text-xs text-gray-400 mb-3">See how well you are doing in each area of farming</p>
                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardContent className="p-4 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="#f1f5f9" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {radarData.map((d) => (
                    <div key={d.subject} className="bg-white rounded-xl p-2.5 shadow-sm text-center">
                      <p className="text-sm font-black text-[#1E3A8A]">{d.A}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{d.subject}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Account Menu */}
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">Account</h2>
              <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                {[
                  { icon: BarChart2, label: "Activity History", sublabel: "See everything you have done on the app" },
                  { icon: FileText, label: "Farm Records", sublabel: "Your farm documents and certificates" },
                  { icon: Users, label: "Invite Farmers", sublabel: "Invite other farmers and earn rewards" },
                  { icon: Settings, label: "Settings", sublabel: "Change your app preferences" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-4 ${i < 3 ? "border-b border-gray-50" : ""} active:bg-gray-50 transition-colors`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.sublabel}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  );
                })}
              </Card>
            </section>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-red-500 bg-red-50 font-bold text-sm active:scale-95 transition-transform"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </>
        )}

        {/* BADGES TAB */}
        {activeTab === "achievements" && (
          <>
            <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg shrink-0">
                  <Star className="w-7 h-7 text-yellow-300" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black text-white">
                    {earnedCount}{" "}
                    <span className="text-base font-semibold text-blue-200">/ {ACHIEVEMENTS.length} badges</span>
                  </p>
                  <p className="text-xs font-bold text-blue-200 mb-2">Keep farming to unlock more!</p>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Badges You Earned ({earnedCount})</h3>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.filter((a) => a.earned).map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <Card key={achievement.id} className="rounded-2xl border-0 bg-white shadow-sm">
                      <CardContent className="p-3.5">
                        <div className={`w-12 h-12 rounded-xl ${achievement.color} flex items-center justify-center mb-2.5`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-black text-gray-900 leading-tight mb-0.5">{achievement.title}</p>
                        <p className="text-xs text-gray-400 leading-tight">{achievement.description}</p>
                        {achievement.earnedAt && (
                          <p className="text-[10px] font-bold text-[#16A34A] mt-1.5">✓ Earned {achievement.earnedAt}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Badges to Unlock ({ACHIEVEMENTS.length - earnedCount})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.filter((a) => !a.earned).map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <Card key={achievement.id} className="rounded-2xl border-0 bg-white shadow-sm opacity-60">
                      <CardContent className="p-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-2.5">
                          <Icon className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-black text-gray-500 leading-tight mb-0.5">{achievement.title}</p>
                        <p className="text-xs text-gray-400 leading-tight">{achievement.description}</p>
                        <p className="text-[10px] font-bold text-gray-300 mt-1.5">🔒 Not yet earned</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* LOAN ACCESS TAB */}
        {activeTab === "readiness" && (
          <>
            <Card className="rounded-2xl border-0 bg-blue-50 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-[#1E3A8A] mb-1">What is this?</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  This shows how ready you are to get a loan, insurance, or farm inputs on credit. Keep adding your farm records and doing more on the app to improve your score and unlock better deals.
                </p>
              </CardContent>
            </Card>

            {readiness ? (
              <div className="space-y-3">
                {[
                  {
                    title: "Bank Loan",
                    sublabel: "Can you get a farming loan?",
                    data: readiness.loanReadiness,
                    icon: Landmark,
                    color: "#16A34A",
                  },
                  {
                    title: "Crop Insurance",
                    sublabel: "Can you insure your crops?",
                    data: readiness.insuranceReadiness,
                    icon: ShieldCheck,
                    color: "#1E3A8A",
                  },
                  {
                    title: "Buy Inputs on Credit",
                    sublabel: "Seeds, fertilizer — pay later",
                    data: readiness.investorReadiness,
                    icon: CreditCard,
                    color: "#d97706",
                  },
                  {
                    title: "NGO & Grant Support",
                    sublabel: "Free help from organisations",
                    data: readiness.ngoReadiness,
                    icon: Award,
                    color: "#9333ea",
                  },
                ].map(({ title, sublabel, data, icon: Icon, color }) => {
                  const s = data.score;
                  const isReady = s >= 80;
                  const isAlmost = s >= 55 && s < 80;
                  return (
                    <Card key={title} className="rounded-2xl border-0 bg-white shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: color + "15" }}
                          >
                            <Icon className="w-6 h-6" style={{ color }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{title}</p>
                            <p className="text-xs text-gray-400">{sublabel}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black" style={{ color }}>{s}%</span>
                            <Badge
                              className={`block text-[9px] font-bold border-0 mt-0.5 ${
                                isReady
                                  ? "bg-green-100 text-green-700"
                                  : isAlmost
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {isReady ? "✓ Ready" : isAlmost ? "Almost" : "Keep Going"}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={s} className="h-3 bg-gray-100 rounded-full mb-3" />
                        {data.tips?.length > 0 && (
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">To improve:</p>
                            {data.tips.slice(0, 2).map((tip: string, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-xs shrink-0" style={{ color }}>→</span>
                                <p className="text-xs text-gray-600 leading-tight">{tip}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Landmark className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-base font-bold text-gray-500 mb-1">No scores yet</p>
                <p className="text-sm text-gray-400 max-w-[220px]">
                  Add your farm records and stay active on the app to see your loan and insurance readiness.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
