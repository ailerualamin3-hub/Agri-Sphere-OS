import React, { useState } from "react";
import {
  Plus, MapPin, Sun, Thermometer, Droplets, Activity,
  AlertTriangle, Bot, CloudRain, Cloud, ChevronRight, Leaf
} from "lucide-react";
import { SeasonPlanner } from "@/components/season-planner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetFarms,
  useGetCrops,
  useGetLivestock,
  useGetClimateForecast,
  useGetFarmSummary,
  useGetLivestockSummary,
  useGenerateSeasonPlan,
  getGetFarmsQueryKey,
  getGetCropsQueryKey,
  getGetLivestockQueryKey,
  getGetClimateForecastQueryKey,
  getGetFarmSummaryQueryKey,
  getGetLivestockSummaryQueryKey,
} from "@workspace/api-client-react";

type Tab = "overview" | "crops" | "livestock" | "climate" | "season";

function HealthBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-7 text-right">{score}</span>
    </div>
  );
}

const stageColors: Record<string, string> = {
  planted: "bg-blue-100 text-blue-700",
  germination: "bg-cyan-100 text-cyan-700",
  vegetative: "bg-emerald-100 text-emerald-700",
  flowering: "bg-purple-100 text-purple-700",
  fruiting: "bg-orange-100 text-orange-700",
  harvest: "bg-amber-100 text-amber-700",
};

const healthColors: Record<string, string> = {
  excellent: "#16A34A",
  good: "#22c55e",
  fair: "#FBBF24",
  poor: "#ef4444",
  critical: "#dc2626",
};

export default function Farm() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: farms, isLoading: farmsLoading } = useGetFarms({ query: { queryKey: getGetFarmsQueryKey() } });
  const { data: crops, isLoading: cropsLoading } = useGetCrops({ query: { queryKey: getGetCropsQueryKey() } });
  const { data: livestock, isLoading: livestockLoading } = useGetLivestock({ query: { queryKey: getGetLivestockQueryKey() } });
  const { data: climate, isLoading: climateLoading } = useGetClimateForecast({ query: { queryKey: getGetClimateForecastQueryKey() } });
  const { data: farmSummary } = useGetFarmSummary({ query: { queryKey: getGetFarmSummaryQueryKey() } });
  const { data: livestockSummary } = useGetLivestockSummary({ query: { queryKey: getGetLivestockSummaryQueryKey() } });

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "crops", label: "Crops" },
    { id: "livestock", label: "Livestock" },
    { id: "climate", label: "Climate" },
    { id: "season", label: "Season Plan" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Farm Management</h1>
            <p className="text-xs text-gray-500">Track operations, health & climate</p>
          </div>
          <Button size="sm" className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl gap-1 px-3">
            <Plus className="w-3.5 h-3.5" /> Add Farm
          </Button>
        </div>
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#16A34A] text-[#16A34A]"
                  : "border-transparent text-gray-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {farmSummary && (
            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-xl border-0 bg-white shadow-sm">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Farms</p>
                  <p className="text-2xl font-black text-[#16A34A]">{farmSummary.totalFarms}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-0 bg-white shadow-sm">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Hectares</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">{farmSummary.totalHectares} ha</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Farm Health Summary */}
          {farmSummary && (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Health Overview</h3>
                  <span className="text-xs text-[#16A34A] font-bold flex items-center gap-0.5">
                    {farmSummary.avgHealthScore}/100 <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-1.5">
                      <span>Crop Health</span>
                    </div>
                    <HealthBar score={82} color="#16A34A" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-1.5">
                      <span>Livestock Health</span>
                    </div>
                    <HealthBar score={85} color="#1E3A8A" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-1.5">
                      <span>Soil Health</span>
                    </div>
                    <HealthBar score={73} color="#FBBF24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Farm List */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Your Farms</h3>
            {farmsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            ) : farms?.length ? (
              <div className="space-y-3">
                {farms.map((farm) => {
                  const s = farm.healthScore ?? 0;
                  const color = s >= 75 ? "#16A34A" : s >= 50 ? "#FBBF24" : "#ef4444";
                  return (
                    <Card key={farm.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                      <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${color}, ${color}80)` }} />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">{farm.name}</h4>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {farm.lga}, {farm.state}
                            </p>
                          </div>
                          <Badge className={`capitalize text-[10px] font-bold border-0 ${
                            farm.farmType === "crop" ? "bg-green-100 text-green-700" :
                            farm.farmType === "livestock" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {farm.farmType}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                            <p className="text-[10px] text-gray-400 font-semibold">Size</p>
                            <p className="text-sm font-black text-gray-900">{farm.sizeHectares}ha</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                            <p className="text-[10px] text-gray-400 font-semibold">Soil</p>
                            <p className="text-xs font-bold text-gray-900 truncate">{farm.soilType ?? "Loamy"}</p>
                          </div>
                          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: color + "15" }}>
                            <p className="text-[10px] font-semibold" style={{ color }}>Health</p>
                            <p className="text-sm font-black" style={{ color }}>{s}/100</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="p-8 text-center">
                  <Leaf className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No farms added yet.</p>
                  <Button size="sm" className="mt-3 bg-[#16A34A] text-white rounded-xl font-bold">Add Your First Farm</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Crops Tab */}
      {activeTab === "crops" && (
        <div className="px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Crop Inventory</h2>
            <Button size="sm" className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl gap-1 px-3">
              <Plus className="w-3.5 h-3.5" /> Add Crop
            </Button>
          </div>
          {cropsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : crops?.length ? (
            <div className="space-y-3">
              {crops.map((crop) => {
                const healthColor = healthColors[crop.healthStatus ?? "good"] ?? "#16A34A";
                const stageClass = stageColors[crop.stage ?? "planted"] ?? "bg-gray-100 text-gray-600";
                return (
                  <Card key={crop.id} className="rounded-2xl border-0 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{crop.name}</h3>
                          <p className="text-xs text-gray-400">{crop.variety ?? "Local Variety"}</p>
                        </div>
                        <Badge className={`${stageClass} border-0 text-[10px] font-bold capitalize`}>
                          {crop.stage ?? "planted"}
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-400 font-semibold mb-1.5">
                          <span>Health Score</span>
                          <span className="font-black" style={{ color: healthColor }}>{crop.healthScore ?? 80}/100</span>
                        </div>
                        <HealthBar score={crop.healthScore ?? 80} color={healthColor} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[9px] text-gray-400 font-semibold uppercase">Plot</p>
                          <p className="text-xs font-black text-gray-900">{crop.plotSizeHectares}ha</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[9px] text-gray-400 font-semibold uppercase">Expected</p>
                          <p className="text-xs font-black text-gray-900">{crop.expectedYieldKg?.toLocaleString()} kg</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[9px] text-gray-400 font-semibold uppercase">Status</p>
                          <p className="text-xs font-bold capitalize" style={{ color: healthColor }}>
                            {crop.healthStatus ?? "good"}
                          </p>
                        </div>
                      </div>
                      {crop.notes && (
                        <div className="mt-3 bg-amber-50 rounded-xl p-2.5 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 leading-tight">{crop.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">No crops recorded.</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Livestock Tab */}
      {activeTab === "livestock" && (
        <div className="px-4 pt-4 pb-8">
          {livestockSummary && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card className="rounded-xl border-0 bg-white shadow-sm">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Animals</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">{livestockSummary.totalAnimals}</p>
                </CardContent>
              </Card>
              <Card className={`rounded-xl border-0 shadow-sm ${livestockSummary.vaccinationsDueSoon > 0 ? "bg-red-50" : "bg-white"}`}>
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Vaccinations Due</p>
                  <p className={`text-2xl font-black ${livestockSummary.vaccinationsDueSoon > 0 ? "text-red-500" : "text-gray-300"}`}>
                    {livestockSummary.vaccinationsDueSoon}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Livestock Register</h2>
            <Button size="sm" className="h-8 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl gap-1 px-3">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          {livestockLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : livestock?.length ? (
            <div className="space-y-3">
              {livestock.map((animal) => {
                const healthColor = healthColors[animal.healthStatus ?? "good"] ?? "#16A34A";
                return (
                  <Card key={animal.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                    <div className="h-1" style={{ background: `linear-gradient(to right, ${healthColor}, ${healthColor}60)` }} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 capitalize">{animal.species}</h3>
                          <p className="text-xs text-gray-400">{animal.breed}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-gray-900">{animal.count}</p>
                          <p className="text-[10px] text-gray-400">animals</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-400 font-semibold mb-1.5">
                          <span>Health Score</span>
                          <span className="font-black" style={{ color: healthColor }}>{animal.healthScore ?? 80}/100</span>
                        </div>
                        <HealthBar score={animal.healthScore ?? 80} color={healthColor} />
                      </div>
                      {animal.nextVaccinationDate && (
                        <div className={`flex items-center gap-2 rounded-xl p-2.5 ${
                          new Date(animal.nextVaccinationDate) <= new Date(Date.now() + 7 * 86400000)
                            ? "bg-red-50" : "bg-gray-50"
                        }`}>
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                            new Date(animal.nextVaccinationDate) <= new Date(Date.now() + 7 * 86400000)
                              ? "text-red-500" : "text-amber-500"
                          }`} />
                          <p className="text-[11px] font-semibold text-gray-700">
                            Next vaccination: {new Date(animal.nextVaccinationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">No livestock recorded.</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Climate Tab */}
      {activeTab === "climate" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {climateLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : climate ? (
            <>
              {/* Current Conditions */}
              <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-blue-200 text-xs font-medium mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {climate.current.location}
                      </p>
                      <div className="flex items-end gap-1">
                        <span className="text-white text-4xl font-black">{climate.current.temperature}°C</span>
                      </div>
                      <p className="text-blue-200 text-sm font-medium">{climate.current.condition}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-xs text-white/90">
                      <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-300" /> {climate.current.humidity}% humidity
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                        <CloudRain className="w-3.5 h-3.5 text-blue-300" /> {climate.current.rainProbability}% rain
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Forecast */}
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {climate.forecast?.map((day: any, i: number) => (
                      <div key={i} className="flex flex-col items-center bg-white/10 backdrop-blur rounded-xl p-2.5 min-w-[56px]">
                        <span className="text-[10px] font-bold text-blue-200 mb-1.5">
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        {day.condition?.toLowerCase().includes("rain") ? (
                          <CloudRain className="w-4 h-4 text-blue-300 mb-1.5" />
                        ) : day.condition?.toLowerCase().includes("cloud") ? (
                          <Cloud className="w-4 h-4 text-gray-300 mb-1.5" />
                        ) : (
                          <Sun className="w-4 h-4 text-yellow-300 mb-1.5" />
                        )}
                        <span className="text-xs font-bold text-white">{day.highTemp}°</span>
                        <span className="text-[10px] text-blue-300">{day.lowTemp}°</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Risk Assessment</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Flood Risk", value: climate.risks?.floodRisk, icon: Droplets },
                    { label: "Drought Risk", value: climate.risks?.droughtRisk, icon: Thermometer },
                    { label: "Heat Risk", value: climate.risks?.heatRisk, icon: Sun },
                    { label: "Pest Risk", value: climate.risks?.pestRisk, icon: AlertTriangle },
                  ].map(({ label, value, icon: Icon }) => {
                    const isHigh = value === "high" || value === "severe";
                    const isMod = value === "moderate";
                    return (
                      <Card key={label} className={`rounded-xl border-0 shadow-sm ${isHigh ? "bg-red-50" : isMod ? "bg-amber-50" : "bg-green-50"}`}>
                        <CardContent className="p-3">
                          <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${isHigh ? "text-red-500" : isMod ? "text-amber-600" : "text-[#16A34A]"}`}>
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </div>
                          <p className="text-sm font-black capitalize text-gray-900">{value}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* AI Recommendations */}
              {climate.recommendations?.length > 0 && (
                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-[#1E3A8A]" /> AI Recommendations
                    </h3>
                    <div className="space-y-2">
                      {climate.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                          <p className="text-xs text-gray-700 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">Climate data unavailable.</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Season Plan Tab */}
      {activeTab === "season" && <SeasonPlanner />}
    </div>
  );
}
