import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import {
  CloudRain, Wind, Droplets, Sun, Cloud, ChevronRight,
  Zap, Bot, ScanLine, Activity, Sprout, MapPin, Navigation,
  Stethoscope, Shield, Wheat, TrendingUp, TrendingDown,
  Minus, AlertTriangle, RefreshCw, Landmark, Building2, BarChart3, FileText
} from "lucide-react";
import { NotificationBell, NotificationPanel, useNotifications } from "@/components/notification-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDashboardSummary,
  useGetAiInsights,
  useGetEmergencyContacts,
  useGetMarketPrices,
  useGetFarmConnectFeed,
  useGetOpportunities,
  useGetFarmerProfile,
  getGetDashboardSummaryQueryKey,
  getGetAiInsightsQueryKey,
  getGetEmergencyContactsQueryKey,
  getGetMarketPricesQueryKey,
  getGetFarmConnectFeedQueryKey,
  getGetOpportunitiesQueryKey,
  getGetFarmerProfileQueryKey,
} from "@workspace/api-client-react";

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("thunder") || c.includes("storm"))
    return <CloudRain className="w-12 h-12 text-blue-300" />;
  if (c.includes("cloud") || c.includes("overcast"))
    return <Cloud className="w-12 h-12 text-gray-300" />;
  return <Sun className="w-12 h-12 text-yellow-300" />;
}

function HealthRing({ score, label, color }: { score: number | null; label: string; color: string }) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center gap-1">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={20} fill="none" stroke="#f1f5f9" strokeWidth="6" />
          <text x="26" y="30" textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">—</text>
        </svg>
        <span className="text-[10px] font-semibold text-gray-400">{label}</span>
      </div>
    );
  }
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="26" cy="26" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e293b">{score}</text>
      </svg>
      <span className="text-[10px] font-semibold text-gray-500">{label}</span>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { farmer: authFarmer } = useAuth();
  const { state: notifState, panelOpen, setPanelOpen, markRead, markAllRead, deleteNotification } = useNotifications();
  const { data: summary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: insights, isLoading: isInsightsLoading } = useGetAiInsights({ query: { queryKey: getGetAiInsightsQueryKey() } });
  const { data: prices } = useGetMarketPrices({ query: { queryKey: getGetMarketPricesQueryKey() } });
  const { data: feed } = useGetFarmConnectFeed({ query: { queryKey: getGetFarmConnectFeedQueryKey() } });
  const { data: emergencyContacts } = useGetEmergencyContacts(undefined, { query: { queryKey: getGetEmergencyContactsQueryKey() } });
  const { data: opportunities } = useGetOpportunities({ query: { queryKey: getGetOpportunitiesQueryKey() } });
  const { data: profile } = useGetFarmerProfile({ query: { queryKey: getGetFarmerProfileQueryKey() } });

  const featuredOpps = opportunities?.filter((o) => o.isFeatured).slice(0, 2) ?? [];

  return (
    <div className="bg-gray-50 min-h-screen">
      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        state={notifState}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onDelete={deleteNotification}
      />
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-green-100">
              <AvatarImage src={profile?.avatarUrl ?? authFarmer?.avatarUrl ?? ""} alt="Farmer" />
              <AvatarFallback className="bg-[#16A34A] text-white text-sm font-bold">
                {(profile?.name ?? authFarmer?.name ?? "F").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-gray-500 font-medium">{greeting()}</p>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{profile?.name ?? authFarmer?.name ?? ""}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell unreadCount={notifState.unreadCount} onClick={() => setPanelOpen(true)} />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">

        {/* 1. Weather Card */}
        <section>
          {isSummaryLoading ? (
            <Skeleton className="h-36 w-full rounded-2xl" />
          ) : summaryError ? (
            <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-[#1e3a8a]/80">
              <CardContent className="p-4 text-white">
                <p className="text-sm font-medium opacity-75">Unable to load weather</p>
                <Button variant="ghost" size="sm" className="text-white mt-2 p-0 h-auto" onClick={() => refetchSummary()}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </CardContent>
            </Card>
          ) : summary?.weather ? (
            <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-[#2563eb] overflow-hidden shadow-lg shadow-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-blue-200 text-xs font-medium mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {summary.weather.location}
                    </p>
                    <div className="flex items-end gap-2">
                      <span className="text-white text-5xl font-black leading-none">{summary.weather.temperature}°</span>
                      <span className="text-blue-200 text-sm font-medium pb-1">{summary.weather.condition}</span>
                    </div>
                  </div>
                  {getWeatherIcon(summary.weather.condition)}
                </div>
                <div className="flex gap-4 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 text-white/90 text-xs">
                    <Droplets className="w-3.5 h-3.5 text-blue-300" />
                    <span className="font-semibold">{summary.weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/90 text-xs">
                    <Wind className="w-3.5 h-3.5 text-blue-300" />
                    <span className="font-semibold">{summary.weather.windSpeed} km/h</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/90 text-xs">
                    <CloudRain className="w-3.5 h-3.5 text-blue-300" />
                    <span className="font-semibold">{summary.weather.rainProbability}% rain</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        {/* 2. Farm Health */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Farm Health</h2>
            <button onClick={() => setLocation("/farm")} className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {isSummaryLoading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : summary?.farmHealth ? (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {(() => {
                        const s = Math.round(summary.farmHealth.overallScore);
                        const color = s >= 75 ? "#16A34A" : s >= 50 ? "#FBBF24" : "#ef4444";
                        const label = s >= 75 ? "Healthy" : s >= 50 ? "Warning" : "Critical";
                        const labelColor = s >= 75 ? "bg-green-100 text-green-700" : s >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                        return (
                          <>
                            <div className="relative w-20 h-20">
                              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                                <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
                                  strokeDasharray={201} strokeDashoffset={201 - (201 * s) / 100}
                                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-gray-900 leading-none">{s}</span>
                              </div>
                            </div>
                            <div>
                              <Badge className={`${labelColor} border-0 text-xs font-bold mb-2`}>{label}</Badge>
                              <p className="text-xs text-gray-500">Overall score</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-4 pl-2">
                    <HealthRing score={summary.farmHealth.cropHealthScore ?? null} label="Crops" color="#16A34A" />
                    <HealthRing score={summary.farmHealth.livestockHealthScore ?? null} label="Animals" color="#1E3A8A" />
                    <HealthRing score={summary.farmHealth.soilHealthScore ?? null} label="Soil" color="#FBBF24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        {/* 3. Quick Diagnose */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Quick Diagnose</h2>
            <button onClick={() => setLocation("/diagnose")} className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5">
              All Scans <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Crop", icon: <Sprout className="w-6 h-6" />, color: "bg-green-50 text-[#16A34A]", type: "crop" },
              { label: "Animal", icon: <Activity className="w-6 h-6" />, color: "bg-blue-50 text-[#1E3A8A]", type: "animal" },
              { label: "Soil", icon: <Zap className="w-6 h-6" />, color: "bg-amber-50 text-amber-600", type: "soil" },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setLocation(`/diagnose`)}
                className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2.5 shadow-sm border border-gray-100 active:scale-95 transition-transform"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 4. FREGE AI Card */}
        <section>
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-[#1e3a8a]/90 shadow-lg shadow-blue-900/20 overflow-hidden">
            <CardContent className="p-5 relative">
              <div className="absolute right-4 top-4 opacity-10">
                <Bot className="w-20 h-20 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-white text-sm font-bold">FREGE AI Assistant</span>
                  <span className="ml-2 text-[10px] bg-green-400/20 text-green-300 px-1.5 py-0.5 rounded-full font-semibold">Online</span>
                </div>
              </div>
              <p className="text-blue-200 text-xs mb-4 leading-relaxed">Ask anything about your crops, livestock, diseases, weather, or market prices.</p>
              <Button
                onClick={() => setLocation("/farmgpt")}
                className="w-full bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm h-9 rounded-xl"
              >
                Ask FREGE AI
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* 5. AI Insights */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">AI Insights</h2>
            <Badge variant="outline" className="text-[10px] font-bold border-green-200 text-green-700 bg-green-50">
              Live
            </Badge>
          </div>
          {isInsightsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : insights?.length ? (
            <div className="space-y-2">
              {insights.slice(0, 4).map((insight, i) => {
                const isUrgent = insight.priority === "high" || insight.priority === "urgent";
                const isMed = insight.priority === "medium";
                return (
                  <Card key={insight.id ?? i} className="rounded-xl border-0 bg-white shadow-sm">
                    <CardContent className="p-3.5 flex gap-3 items-start">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isUrgent ? "bg-red-500" : isMed ? "bg-amber-400" : "bg-[#16A34A]"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 leading-tight">{insight.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{insight.message}</p>
                      </div>
                      {isUrgent && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-xl border-0 bg-white shadow-sm">
              <CardContent className="p-4 text-center text-xs text-gray-400">No new insights right now.</CardContent>
            </Card>
          )}
        </section>

        {/* 6. Government Opportunities */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Govt Opportunities</h2>
            <button onClick={() => setLocation("/opportunities")} className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {featuredOpps.length > 0 ? (
            <div className="space-y-3">
              {featuredOpps.map((opp) => (
                <Card key={opp.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-[#16A34A] to-[#1E3A8A]" />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#1E3A8A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-1">{opp.title}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{opp.provider.split(" / ")[0]}</p>
                        {opp.amountDescription && (
                          <p className="text-[11px] font-bold text-[#16A34A] mt-1">{opp.amountDescription}</p>
                        )}
                      </div>
                      <button onClick={() => setLocation("/opportunities")} className="text-[#16A34A]">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <button
                onClick={() => setLocation("/opportunities")}
                className="w-full py-3 rounded-2xl bg-[#1E3A8A]/5 text-[#1E3A8A] text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Landmark className="w-3.5 h-3.5" /> See All {opportunities?.length ?? 0} Opportunities
              </button>
            </div>
          ) : (
            <Card className="rounded-2xl border-0 bg-gradient-to-r from-[#1E3A8A]/5 to-[#16A34A]/5 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-[#1E3A8A]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">Government & NGO Programmes</p>
                  <p className="text-[10px] text-gray-500">Grants, subsidies, training & equipment for farmers</p>
                </div>
                <button onClick={() => setLocation("/opportunities")} className="text-[#16A34A]">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 7. Market Prices */}
        {prices && prices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Market Prices</h2>
              <button onClick={() => setLocation("/market")} className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5">
                All Prices <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border-0 overflow-hidden">
              {prices.slice(0, 4).map((price, i) => (
                <div key={price.id} className={`flex items-center justify-between px-4 py-3 ${i < 3 ? "border-b border-gray-50" : ""}`}>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{price.commodity}</p>
                    <p className="text-[10px] text-gray-400">per {price.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">₦{price.pricePerKg?.toLocaleString()}</p>
                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${
                      price.trend === "rising" ? "text-green-600" : price.trend === "falling" ? "text-red-500" : "text-gray-400"
                    }`}>
                      {price.trend === "rising" ? <TrendingUp className="w-3 h-3" /> : price.trend === "falling" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {price.changePercent != null ? `${Math.abs(price.changePercent)}%` : "Stable"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Finance & Reports */}
        <section>
          <button onClick={() => setLocation("/reports")} className="w-full">
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-r from-[#1E3A8A] to-blue-700 text-white">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold">Finance & Reports</p>
                  <p className="text-xs text-blue-200">Record income/expenses · Generate bank-ready reports</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
              </CardContent>
            </Card>
          </button>
        </section>

        {/* 8. Nearby Services */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Nearby Services</h2>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Kano State
            </span>
          </div>
          {emergencyContacts && emergencyContacts.length > 0 ? (
            <div className="space-y-2">
              {emergencyContacts.map((contact: any) => {
                const iconMap: Record<string, React.ReactNode> = {
                  hospital: <Stethoscope className="w-5 h-5" />,
                  police: <Shield className="w-5 h-5" />,
                  veterinary: <Activity className="w-5 h-5" />,
                  extension: <Wheat className="w-5 h-5" />,
                  fire: <AlertTriangle className="w-5 h-5" />,
                };
                const colorMap: Record<string, string> = {
                  hospital: "bg-red-50 text-red-500",
                  police: "bg-blue-50 text-blue-500",
                  veterinary: "bg-orange-50 text-orange-500",
                  extension: "bg-green-50 text-green-600",
                  fire: "bg-amber-50 text-amber-600",
                };
                const icon = iconMap[contact.type] ?? <Shield className="w-5 h-5" />;
                const color = colorMap[contact.type] ?? "bg-gray-50 text-gray-500";
                return (
                  <Card key={contact.id} className="rounded-xl border-0 bg-white shadow-sm">
                    <CardContent className="p-3.5 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{contact.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium capitalize">{contact.type} • {contact.distance} km away</p>
                      </div>
                      <a href={`tel:${contact.phone}`} className="text-[10px] font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                        <Navigation className="w-3 h-3" /> Call
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-xl border-0 bg-white shadow-sm">
              <CardContent className="p-4 text-center text-xs text-gray-400">No nearby services data available yet.</CardContent>
            </Card>
          )}
        </section>

        {/* Community Highlights */}
        {feed && feed.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Community</h2>
              <button onClick={() => setLocation("/community")} className="text-xs text-[#16A34A] font-semibold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {feed.slice(0, 2).map((post) => (
                <Card key={post.id} className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={post.authorAvatar || undefined} />
                        <AvatarFallback className="text-[10px] font-bold bg-green-100 text-green-700">
                          {post.authorName?.charAt(0) ?? "F"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-gray-900">{post.authorName}</span>
                      {post.authorVerified && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Verified</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{post.content}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-gray-400 font-semibold">
                      <span>❤ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
