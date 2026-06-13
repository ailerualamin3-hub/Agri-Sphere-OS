import React, { useState } from "react";
import {
  ShieldCheck, TrendingUp, CheckCircle2, Award, Landmark,
  CreditCard, ChevronRight, Star, Users, BarChart2,
  FileText, Settings, LogOut, Edit3, Trophy, Zap,
  Sprout, MessageSquare, ShoppingCart, Calendar, Medal
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    description: "Completed your first crop harvest",
    icon: Sprout,
    color: "bg-green-50 text-[#16A34A]",
    earned: true,
    earnedAt: "Jan 2025",
  },
  {
    id: 2,
    title: "AI Adopter",
    description: "Used FarmGPT AI assistant 5+ times",
    icon: Zap,
    color: "bg-blue-50 text-[#1E3A8A]",
    earned: true,
    earnedAt: "Mar 2025",
  },
  {
    id: 3,
    title: "Community Pillar",
    description: "Received 10+ likes on community posts",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    earned: true,
    earnedAt: "Apr 2025",
  },
  {
    id: 4,
    title: "Market Trader",
    description: "Listed 3+ products on the marketplace",
    icon: ShoppingCart,
    color: "bg-amber-50 text-amber-600",
    earned: true,
    earnedAt: "May 2025",
  },
  {
    id: 5,
    title: "Season Planner",
    description: "Generated your first season planting plan",
    icon: Calendar,
    color: "bg-teal-50 text-teal-600",
    earned: false,
    earnedAt: null,
  },
  {
    id: 6,
    title: "Disease Detector",
    description: "Completed 5 crop or animal diagnoses",
    icon: ShieldCheck,
    color: "bg-red-50 text-red-500",
    earned: false,
    earnedAt: null,
  },
  {
    id: 7,
    title: "Gold Farmer",
    description: "Reached Gold membership level",
    icon: Star,
    color: "bg-yellow-50 text-yellow-500",
    earned: true,
    earnedAt: "Feb 2025",
  },
  {
    id: 8,
    title: "Livestock Guardian",
    description: "Kept all livestock health scores above 80",
    icon: Medal,
    color: "bg-orange-50 text-orange-500",
    earned: false,
    earnedAt: null,
  },
  {
    id: 9,
    title: "Record Keeper",
    description: "Added farm records for 3 consecutive months",
    icon: FileText,
    color: "bg-indigo-50 text-indigo-600",
    earned: false,
    earnedAt: null,
  },
  {
    id: 10,
    title: "Community Voice",
    description: "Posted in community 10+ times",
    icon: MessageSquare,
    color: "bg-pink-50 text-pink-500",
    earned: false,
    earnedAt: null,
  },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const { data: profile, isLoading: isProfileLoading } = useGetFarmerProfile({ query: { queryKey: getGetFarmerProfileQueryKey() } });
  const { data: scoreData, isLoading: isScoreLoading } = useGetNeuroScore({ query: { queryKey: getGetNeuroScoreQueryKey() } });
  const { data: breakdown } = useGetNeuroScoreBreakdown({ query: { queryKey: getGetNeuroScoreBreakdownQueryKey() } });
  const { data: readiness } = useGetReadinessScores({ query: { queryKey: getGetReadinessScoresQueryKey() } });

  const radarData = breakdown
    ? [
        { subject: "Crops", A: breakdown.cropPerformance, fullMark: 100 },
        { subject: "Livestock", A: breakdown.livestockPerformance, fullMark: 100 },
        { subject: "Community", A: breakdown.communityReputation, fullMark: 100 },
        { subject: "Activity", A: breakdown.farmActivity, fullMark: 100 },
        { subject: "Market", A: breakdown.marketplaceActivity, fullMark: 100 },
        { subject: "Records", A: breakdown.farmRecords, fullMark: 100 },
      ]
    : [];

  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A] to-blue-700 px-4 pt-12 pb-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <ShieldCheck className="w-40 h-40" />
        </div>
        <div className="flex items-start gap-4 mb-5 relative z-10">
          {isProfileLoading ? (
            <Skeleton className="w-20 h-20 rounded-2xl" />
          ) : (
            <div className="relative">
              <Avatar className="w-20 h-20 rounded-2xl border-2 border-white/30 shadow-xl">
                <AvatarImage src="https://i.pravatar.cc/150?u=aminu" />
                <AvatarFallback className="bg-white/20 text-white text-xl font-black rounded-2xl">
                  {profile?.name?.charAt(0) ?? "A"}
                </AvatarFallback>
              </Avatar>
              {profile?.verificationStatus === "verified" && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#16A34A] rounded-full flex items-center justify-center border-2 border-white">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          )}
          <div className="flex-1">
            {isProfileLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32 bg-white/20 rounded" />
                <Skeleton className="h-3 w-24 bg-white/20 rounded" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-white mb-0.5">{profile?.name ?? "Aminu Kano"}</h1>
                <p className="text-blue-200 text-xs font-medium">ID: FRG-{(profile?.id ?? 1).toString().padStart(6, "0")}</p>
                <p className="text-blue-200 text-xs">{profile?.state ?? "Kano"}, Nigeria</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge className="bg-[#FBBF24]/20 text-yellow-300 border-0 text-[10px] font-bold px-2 py-0.5">
                    <Star className="w-3 h-3 mr-0.5" /> Gold Member
                  </Badge>
                  <Badge className="bg-white/10 text-blue-100 border-0 text-[10px] font-bold px-2 py-0.5 capitalize">
                    {profile?.farmingType ?? "Mixed"} Farmer
                  </Badge>
                </div>
              </>
            )}
          </div>
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Edit3 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* NeuroScore Gauge */}
        {isScoreLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl bg-white/10" />
        ) : scoreData ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-1">NeuroScore™</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-white leading-none">{scoreData.score}</span>
                  <span className="text-blue-200 text-xs font-semibold pb-1">/ 100</span>
                </div>
                <Badge className="bg-[#FBBF24]/20 text-yellow-300 border-0 text-[10px] font-bold mt-1.5">
                  <Award className="w-3 h-3 mr-0.5" /> {scoreData.level} Level
                </Badge>
              </div>
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#FBBF24" strokeWidth="7"
                    strokeDasharray={188} strokeDashoffset={188 - (188 * scoreData.score) / 100}
                    strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-0.5 text-white">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span className="text-xs font-bold text-[#FBBF24]">+{scoreData.change30Days}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex mt-4 -mx-4">
          {([
            { id: "overview", label: "Overview" },
            { id: "achievements", label: "Achievements" },
            { id: "readiness", label: "Readiness" },
          ] as { id: ProfileTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#FBBF24] text-white"
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
            {/* Farm Passport */}
            {profile && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 mb-3">Farm Passport</h2>
                <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#16A34A] via-[#FBBF24] to-[#1E3A8A]" />
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Farming Type", value: profile.farmingType ?? "Mixed", capitalize: true },
                        { label: "State", value: profile.state ?? "Kano" },
                        { label: "Reputation", value: "Gold Member" },
                        { label: "Status", value: profile.verificationStatus ?? "Verified", capitalize: true },
                        { label: "Member Since", value: new Date(profile.joinedAt ?? Date.now()).getFullYear().toString() },
                        { label: "LGA", value: profile.lga ?? "Kano Municipal" },
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
                <h2 className="text-sm font-bold text-gray-900 mb-3">Score Breakdown</h2>
                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardContent className="p-4 h-[240px]">
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
                      <p className="text-xs font-black text-[#1E3A8A]">{d.A}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{d.subject}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Account Menu */}
            <section>
              <h2 className="text-sm font-bold text-gray-900 mb-3">Account</h2>
              <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                {[
                  { icon: BarChart2, label: "Activity History", sublabel: "View your farm activity log" },
                  { icon: FileText, label: "Farm Records", sublabel: "Documents & certificates" },
                  { icon: Users, label: "Referrals", sublabel: "Invite farmers, earn credits" },
                  { icon: Settings, label: "Settings", sublabel: "Preferences & notifications" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 3 ? "border-b border-gray-50" : ""} active:bg-gray-50 transition-colors`}>
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <p className="text-[10px] text-gray-400">{item.sublabel}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  );
                })}
              </Card>
            </section>

            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-red-500 bg-red-50 font-bold text-sm">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === "achievements" && (
          <>
            {/* Summary Banner */}
            <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#FBBF24]/20 to-[#FBBF24]/5 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FBBF24] flex items-center justify-center shadow-lg shadow-amber-200">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{earnedCount} <span className="text-base font-semibold text-gray-400">/ {ACHIEVEMENTS.length}</span></p>
                  <p className="text-xs font-bold text-gray-600">Achievements Earned</p>
                  <Progress value={(earnedCount / ACHIEVEMENTS.length) * 100} className="h-1.5 mt-2 bg-amber-100" />
                </div>
              </CardContent>
            </Card>

            {/* Earned */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Earned ({earnedCount})</h3>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.filter((a) => a.earned).map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <Card key={achievement.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                      <CardContent className="p-3.5">
                        <div className={`w-11 h-11 rounded-xl ${achievement.color} flex items-center justify-center mb-2.5`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-black text-gray-900 leading-tight mb-0.5">{achievement.title}</p>
                        <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{achievement.description}</p>
                        {achievement.earnedAt && (
                          <p className="text-[9px] font-bold text-[#16A34A] mt-1.5">{achievement.earnedAt}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Locked */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Locked ({ACHIEVEMENTS.length - earnedCount})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.filter((a) => !a.earned).map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <Card key={achievement.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden opacity-60">
                      <CardContent className="p-3.5">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center mb-2.5 relative">
                          <Icon className="w-5 h-5 text-gray-300" />
                          <div className="absolute inset-0 rounded-xl flex items-center justify-center">
                            <span className="text-gray-400 text-lg">🔒</span>
                          </div>
                        </div>
                        <p className="text-xs font-black text-gray-500 leading-tight mb-0.5">{achievement.title}</p>
                        <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{achievement.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* READINESS TAB */}
        {activeTab === "readiness" && (
          <>
            {readiness ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your financial readiness scores help you access credit, insurance, and investment. Improve your farm records and activity to unlock better rates.
                </p>
                {[
                  { title: "Micro-Loan Readiness", data: readiness.loanReadiness, icon: Landmark, color: "#16A34A" },
                  { title: "Crop Insurance", data: readiness.insuranceReadiness, icon: ShieldCheck, color: "#1E3A8A" },
                  { title: "Input Credit", data: readiness.investorReadiness, icon: CreditCard, color: "#FBBF24" },
                  { title: "NGO / Grant Access", data: readiness.ngoReadiness, icon: Award, color: "#9333ea" },
                ].map(({ title, data, icon: Icon, color }) => {
                  const s = data.score;
                  const isReady = s >= 80;
                  const isAlmost = s >= 55 && s < 80;
                  return (
                    <Card key={title} className="rounded-2xl border-0 bg-white shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-gray-900">{title}</p>
                              <span className="text-sm font-black" style={{ color }}>{s}%</span>
                            </div>
                            <Badge className={`text-[9px] font-bold border-0 mt-0.5 ${
                              isReady ? "bg-green-100 text-green-700" :
                              isAlmost ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            }`}>
                              {isReady ? "Ready" : isAlmost ? "Almost Ready" : "Developing"}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={s} className="h-2 bg-gray-100 mb-3" />
                        {data.tips?.length > 0 && (
                          <div className="space-y-1.5">
                            {data.tips.slice(0, 2).map((tip: string, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                                <p className="text-[10px] text-gray-500 leading-tight">{tip}</p>
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
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Landmark className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-500 mb-1">No readiness data yet</p>
                <p className="text-xs text-gray-400">Add your farm records and activity to generate your readiness scores.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
