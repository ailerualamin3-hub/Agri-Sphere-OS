import React, { useState } from "react";
import {
  CalendarDays, Sprout, ChevronDown, Loader2,
  Leaf, Shield, Sun, CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGenerateSeasonPlan } from "@workspace/api-client-react";

const CROPS = [
  "Maize", "Rice", "Sorghum", "Cowpea", "Groundnut",
  "Millet", "Soybeans", "Cassava", "Yam", "Cotton",
];
const STATES = [
  "Kano", "Kaduna", "Katsina", "Sokoto", "Zamfara", "Kebbi", "Niger",
  "Borno", "Yobe", "Adamawa", "Gombe", "Bauchi", "Plateau", "Taraba",
  "Nasarawa", "FCT", "Kwara", "Oyo", "Osun", "Ogun", "Lagos", "Ondo",
  "Edo", "Delta", "Anambra", "Enugu", "Imo", "Abia", "Ebonyi",
  "Cross River", "Akwa Ibom", "Rivers", "Bayelsa",
];

function bags(rateKgPerHa: number, farmHa: number) {
  return Math.max(1, Math.round((rateKgPerHa * farmHa) / 50));
}

function extractMonth(text: string): string {
  if (!text) return "—";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  for (const m of months) {
    if (text.includes(m)) return m;
  }
  return text.split(/[\s–-]/)[0] ?? text;
}

export function SeasonPlanner() {
  const [crop, setCrop] = useState("Maize");
  const [state, setState] = useState("Kano");
  const [farmSize, setFarmSize] = useState("1");
  const [unit, setUnit] = useState<"ha" | "plots">("ha");
  const [plan, setPlan] = useState<any>(null);

  const { mutate: generate, isPending } = useGenerateSeasonPlan({
    mutation: { onSuccess: (data: any) => setPlan(data) },
  });

  const farmHectares =
    unit === "plots" ? Number(farmSize) * 0.25 : Number(farmSize);

  const handleGenerate = () => {
    setPlan(null);
    generate({ data: { crop, state, farmSizeHectares: farmHectares } });
  };

  const ferts: any[] = plan?.fertilizerSchedule ?? [];
  const sorted = [...ferts].sort((a, b) => a.weekAfterPlanting - b.weekAfterPlanting);
  const basal = sorted[0];
  const top1 = sorted[1];
  const top2 = sorted[2];

  const plantMonth = extractMonth(plan?.plantingWindow ?? "");
  const harvestMonth = extractMonth(plan?.estimatedHarvestDate ?? "");
  const indicators: string[] = plan?.harvestIndicators ?? [];

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">

      {/* ── INPUTS ── */}
      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-0.5">Create Your Season Plan</h3>
            <p className="text-xs text-gray-400">Fill in 3 simple details and get your full planting guide.</p>
          </div>

          {/* Crop */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">
              🌾 What crop are you planting?
            </label>
            <div className="relative">
              <select
                value={crop}
                onChange={(e) => { setCrop(e.target.value); setPlan(null); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 appearance-none pr-9"
              >
                {CROPS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* State */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">
              📍 Which state is your farm?
            </label>
            <div className="relative">
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 appearance-none pr-9"
              >
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Farm Size */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">
              📐 How big is your farm?
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900"
                placeholder="e.g. 2"
              />
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  onClick={() => setUnit("ha")}
                  className={`px-3 py-3 text-xs font-bold transition-colors ${unit === "ha" ? "bg-[#16A34A] text-white" : "bg-gray-50 text-gray-500"}`}
                >
                  Hectares
                </button>
                <button
                  onClick={() => setUnit("plots")}
                  className={`px-3 py-3 text-xs font-bold transition-colors ${unit === "plots" ? "bg-[#16A34A] text-white" : "bg-gray-50 text-gray-500"}`}
                >
                  Plots
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {unit === "plots" ? `${farmSize} plots ≈ ${farmHectares.toFixed(2)} hectares` : "1 hectare ≈ 4 football fields"}
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isPending || !farmSize || Number(farmSize) <= 0}
            className="w-full h-13 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-black text-base flex items-center justify-center gap-2 py-4"
          >
            {isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Building your plan...</>
            ) : (
              <><CalendarDays className="w-5 h-5" /> Generate My Season Plan</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── LOADING STATE ── */}
      {isPending && (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <Sprout className="w-8 h-8 text-[#16A34A] animate-pulse" />
          </div>
          <p className="text-sm font-bold text-gray-600">Building your season plan...</p>
          <p className="text-xs text-gray-400">This takes a few seconds</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {plan && !isPending && (
        <>
          {/* Summary Banner */}
          <div className="bg-gradient-to-br from-[#16A34A] to-green-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-sm font-semibold text-green-100 mb-0.5">{state} State · {farmHectares} hectare{farmHectares !== 1 ? "s" : ""}</p>
            <h2 className="text-2xl font-black mb-3">{crop} Season Plan ✓</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-[10px] text-green-200 font-semibold mb-0.5">PLANT IN</p>
                <p className="text-base font-black">{plantMonth}</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-[10px] text-green-200 font-semibold mb-0.5">HARVEST IN</p>
                <p className="text-base font-black">{harvestMonth}</p>
              </div>
            </div>
          </div>

          {/* STAGE 1 */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-base">1</span>
              </div>
              <div>
                <p className="text-white font-black text-sm">PLANTING TIME</p>
                <p className="text-green-200 text-xs">Month of {plantMonth}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-800 leading-relaxed">
                  <span className="font-black">Plant your {crop} in {plantMonth}.</span> This is the best time for your farm in {state}.
                </p>
              </div>
              {basal && (
                <div className="bg-green-50 rounded-xl p-3 flex items-start gap-3">
                  <Leaf className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Apply First Fertilizer (Basal) before or during planting
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{basal.notes}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5">
                      <span className="text-base font-black">{bags(basal.rateKgPerHa, farmHectares)}</span>
                      <span className="text-xs font-semibold">bags needed</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STAGE 2 */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="bg-blue-700 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-base">2</span>
              </div>
              <div>
                <p className="text-white font-black text-sm">CARE & FERTILIZER</p>
                <p className="text-blue-200 text-xs">Growing phase — keep feeding your crop</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {top1 && (
                <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shrink-0 text-white font-black text-xs">
                    W{top1.weekAfterPlanting}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      Week {top1.weekAfterPlanting} — Apply Second Fertilizer (Urea) to boost growth
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{top1.notes}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-700 text-white rounded-lg px-3 py-1.5">
                      <span className="text-base font-black">{bags(top1.rateKgPerHa, farmHectares)}</span>
                      <span className="text-xs font-semibold">bags needed</span>
                    </div>
                  </div>
                </div>
              )}
              {top2 && (
                <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shrink-0 text-white font-black text-xs">
                    W{top2.weekAfterPlanting}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      Week {top2.weekAfterPlanting} — Apply Final Fertilizer (Urea) to help grains form
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{top2.notes}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-700 text-white rounded-lg px-3 py-1.5">
                      <span className="text-base font-black">{bags(top2.rateKgPerHa, farmHectares)}</span>
                      <span className="text-xs font-semibold">bags needed</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STAGE 3 */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="bg-amber-600 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-base">3</span>
              </div>
              <div>
                <p className="text-white font-black text-sm">PROTECTING YOUR CROP</p>
                <p className="text-amber-100 text-xs">Watch out for pests and diseases</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {(plan?.pestMonitoringSchedule ?? []).length > 0
                ? (plan.pestMonitoringSchedule as any[]).slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Week {p.weekAfterPlanting} — {p.action}
                        </p>
                        {p.product && p.product !== "None" && (
                          <p className="text-xs text-gray-400 mt-0.5">Use: {p.product}</p>
                        )}
                      </div>
                    </div>
                  ))
                : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-sm text-gray-800">
                        <span className="font-bold">Weeks 2–5:</span> Check your leaves for spots, holes, or strange colours. If you see damage, spray general crop protection medicine.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-sm text-gray-800">
                        <span className="font-bold">Week 10:</span> Keep birds away from the farm as the grains start to fill up.
                      </p>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* STAGE 4 */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="bg-[#1E3A8A] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-base">4</span>
              </div>
              <div>
                <p className="text-white font-black text-sm">HARVEST TIME 🎉</p>
                <p className="text-blue-200 text-xs">Month of {harvestMonth}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-sm font-black text-[#1E3A8A]">
                  Harvest your {crop} in {harvestMonth}
                </p>
                {plan?.estimatedYieldKg && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expected yield: <span className="font-bold">{Number(plan.estimatedYieldKg).toLocaleString()} kg</span> from your {farmHectares} hectare{farmHectares !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Signs your crop is ready to harvest:</p>
              {indicators.length > 0
                ? indicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800">{ind}</p>
                    </div>
                  ))
                : (
                  <>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800">Leaves turn a beautiful golden yellow colour</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800">Grains feel hard and dry when you press them</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800">The cob or pod is fully formed and firm</p>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Totals summary */}
          <Card className="rounded-2xl border-0 bg-gray-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Total Fertilizer Bags Needed</p>
              <div className="grid grid-cols-3 gap-2">
                {sorted.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <p className="text-2xl font-black text-[#16A34A]">{bags(f.rateKgPerHa, farmHectares)}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">bags</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Week {f.weekAfterPlanting}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">1 bag = 50 kg</p>
            </CardContent>
          </Card>

          <Button
            onClick={() => { setPlan(null); }}
            variant="outline"
            className="w-full h-12 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 text-sm"
          >
            Start a New Plan
          </Button>
        </>
      )}
    </div>
  );
}
