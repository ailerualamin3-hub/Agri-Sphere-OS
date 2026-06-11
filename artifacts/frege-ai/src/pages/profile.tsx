import React from "react";
import {
  ShieldCheck, TrendingUp, CheckCircle2, Award, Landmark,
  CreditCard, ChevronRight, Star, Layers, Users, BarChart2,
  FileText, Settings, LogOut, Edit3
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

export default function Profile() {
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

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A] to-blue-700 px-4 pt-12 pb-8 relative overflow-hidden">
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
                <AvatarFallback className="bg-white/20 text-white text-xl font-black rounded-2xl">AK</AvatarFallback>
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
      </div>

      <div className="px-4 pt-5 pb-8 space-y-5">
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

        {/* Financial Readiness */}
        {readiness && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Financial Readiness</h2>
            <div className="space-y-2">
              {[
                { title: "Micro-Loan", data: readiness.loanReadiness, icon: Landmark, color: "#16A34A" },
                { title: "Crop Insurance", data: readiness.insuranceReadiness, icon: ShieldCheck, color: "#1E3A8A" },
                { title: "Input Credit", data: readiness.investorReadiness, icon: CreditCard, color: "#FBBF24" },
              ].map(({ title, data, icon: Icon, color }) => {
                const s = data.score;
                const isReady = s >= 80;
                const isAlmost = s >= 55 && s < 80;
                return (
                  <Card key={title} className="rounded-xl border-0 bg-white shadow-sm">
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
                      <Progress value={s} className="h-2 bg-gray-100" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Profile Menu */}
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
      </div>
    </div>
  );
}
