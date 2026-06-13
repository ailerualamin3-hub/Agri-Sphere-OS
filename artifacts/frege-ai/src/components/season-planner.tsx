import React, { useState } from "react";
import {
  CalendarDays, Sprout, CheckCircle2, Loader2, ChevronDown, AlertTriangle, Leaf
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGenerateSeasonPlan } from "@workspace/api-client-react";

const CROPS = ["Maize", "Rice", "Sorghum", "Cowpea", "Groundnut", "Millet", "Soybeans", "Cassava", "Yam", "Cotton"];
const STATES = ["Kano", "Kaduna", "Katsina", "Sokoto", "Zamfara", "Kebbi", "Niger", "Borno", "Yobe", "Adamawa", "Gombe", "Bauchi", "Plateau", "Taraba", "Nasarawa", "FCT", "Kwara", "Oyo", "Osun", "Ogun", "Lagos", "Ondo", "Edo", "Delta", "Anambra", "Enugu", "Imo", "Abia", "Ebonyi", "Cross River", "Akwa Ibom", "Rivers", "Bayelsa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function SeasonPlanner() {
  const [crop, setCrop] = useState("Maize");
  const [state, setState] = useState("Kano");
  const [farmSize, setFarmSize] = useState("1");
  const [plantingMonth, setPlantingMonth] = useState("");
  const [plan, setPlan] = useState<any>(null);

  const { mutate: generate, isPending } = useGenerateSeasonPlan({
    mutation: {
      onSuccess: (data) => setPlan(data),
    },
  });

  const handleGenerate = () => {
    generate({
      data: {
        crop,
        state,
        farmSizeHectares: Number(farmSize),
        plantingMonth: plantingMonth || undefined,
      },
    });
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Form */}
      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#16A34A]" /> Generate Season Plan
          </h3>
          <p className="text-xs text-gray-400">Enter your crop and farm details to get a personalized planting calendar.</p>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Crop</label>
            <div className="relative">
              <select
                value={crop}
                onChange={(e) => { setCrop(e.target.value); setPlan(null); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 appearance-none pr-8"
              >
                {CROPS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">State</label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-900 appearance-none pr-6"
                >
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Farm Size (ha)</label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Planting Month (optional)</label>
            <div className="relative">
              <select
                value={plantingMonth}
                onChange={(e) => setPlantingMonth(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 appearance-none pr-8"
              >
                <option value="">Use recommended window</option>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isPending || !farmSize || Number(farmSize) <= 0}
            className="w-full h-11 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-sm flex items-center gap-2"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Plan...</>
            ) : (
              <><CalendarDays className="w-4 h-4" /> Generate Season Plan</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Plan Results */}
      {plan && (
        <>
          {/* Summary */}
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#16A34A] to-green-600 shadow-lg overflow-hidden">
            <CardContent className="p-4 text-white">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-green-100 text-xs font-semibold mb-0.5">{plan.state} State</p>
                  <h2 className="text-2xl font-black">{plan.crop} Season Plan</h2>
                  <p className="text-green-100 text-xs mt-1">{plan.farmSizeHectares} hectare(s)</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Sprout className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/15 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-green-100 font-semibold">Plant</p>
                  <p className="text-xs font-black">{plan.plantingWindow.split(" – ")[0].split("(")[0].trim()}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-green-100 font-semibold">Harvest</p>
                  <p className="text-xs font-black">{plan.estimatedHarvestDate?.split(" ")[0] ?? `Day ${plan.maturityDays}`}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-green-100 font-semibold">Est. Yield</p>
                  <p className="text-xs font-black">{plan.estimatedYieldKg?.toLocaleString()} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fertilizer Schedule */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#16A34A]" /> Fertilizer Schedule
            </h3>
            <div className="space-y-2">
              {plan.fertilizerSchedule?.map((f: any, i: number) => (
                <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-gray-900">{f.product}</p>
                      <Badge className="bg-green-100 text-green-700 border-0 text-[10px] font-bold shrink-0">
                        Week {f.weekAfterPlanting}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500">{f.notes}</p>
                    <p className="text-[10px] font-bold text-[#16A34A] mt-1">
                      {f.totalKg ?? f.rateKgPerHa} kg total ({f.rateKgPerHa} kg/ha)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Pest Monitoring */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Pest & Disease Monitoring
            </h3>
            <div className="space-y-2">
              {plan.pestMonitoringSchedule?.map((p: any, i: number) => (
                <Card key={i} className={`rounded-xl border-0 shadow-sm ${p.preventive ? "bg-amber-50" : "bg-white"}`}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-gray-900">{p.action}</p>
                      <Badge className={`border-0 text-[10px] font-bold shrink-0 ${p.preventive ? "bg-amber-200 text-amber-800" : "bg-red-100 text-red-700"}`}>
                        Week {p.weekAfterPlanting}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500">Product: {p.product}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Harvest Indicators */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1E3A8A]" /> Harvest Indicators
            </h3>
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-4 space-y-2">
                {plan.harvestIndicators?.map((indicator: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 leading-tight">{indicator}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Weekly Timeline */}
          {plan.weeklyTimeline?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-500" /> Weekly Timeline
              </h3>
              <div className="relative pl-5">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#16A34A] to-[#1E3A8A]" />
                <div className="space-y-4">
                  {plan.weeklyTimeline.map((item: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-[#16A34A] border-2 border-white shadow-sm" />
                      <div className="bg-white rounded-xl shadow-sm p-3">
                        <p className="text-xs font-bold text-gray-900 mb-1">{item.label}</p>
                        {item.activities?.map((act: string, j: number) => (
                          <div key={j} className="flex items-start gap-1.5 mt-1">
                            <div className="w-1 h-1 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                            <p className="text-[11px] text-gray-600 leading-tight">{act}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
