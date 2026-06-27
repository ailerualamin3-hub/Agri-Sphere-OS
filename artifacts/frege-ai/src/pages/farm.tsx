import React, { useState } from "react";
import {
  Plus, MapPin, Sun, Thermometer, Droplets, Activity,
  AlertTriangle, Bot, CloudRain, Cloud, ChevronRight, Leaf,
  X, Loader2, Sprout, Calendar, Tractor, Check
} from "lucide-react";
import { SeasonPlanner } from "@/components/season-planner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type Tab = "overview" | "crops" | "livestock" | "climate" | "season" | "ai";

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

const CROP_TYPES = ["Maize","Rice","Cassava","Yam","Sorghum","Millet","Cowpea","Groundnut","Tomato",
  "Pepper","Onion","Okra","Plantain","Cocoa","Palm Oil","Cotton","Sesame","Soybean","Other"];

const LIVESTOCK_SPECIES = ["Cattle","Goat","Sheep","Poultry (Chicken)","Poultry (Turkey)",
  "Pig","Fish (Catfish)","Fish (Tilapia)","Rabbit","Guinea Fowl","Other"];

const CROP_STAGES = ["planted","germination","vegetative","flowering","fruiting","harvest"];
const SOIL_TYPES = ["Loamy","Sandy","Clay","Silty","Sandy Loam","Clay Loam","Peaty","Chalky"];
const FARM_TYPES = ["crop","livestock","mixed"];
const IRRIGATION_TYPES = ["rainfed","drip","sprinkler","flood","furrow","none"];

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

function AddFarmModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    state: "",
    lga: "",
    sizeHectares: "",
    farmType: "crop",
    soilType: "Loamy",
    irrigationType: "rainfed",
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Farm name is required", variant: "destructive" }); return; }
    if (!form.state) { toast({ title: "Please select your state", variant: "destructive" }); return; }
    if (!form.sizeHectares || isNaN(Number(form.sizeHectares)) || Number(form.sizeHectares) <= 0) {
      toast({ title: "Enter a valid farm size", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await apiFetch("/farms", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          state: form.state,
          lga: form.lga.trim() || form.state,
          sizeHectares: Number(form.sizeHectares),
          farmType: form.farmType,
          soilType: form.soilType,
          irrigationType: form.irrigationType,
        }),
      });
      toast({ title: "Farm added!", description: `${form.name} has been registered.` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Failed to add farm", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Tractor className="w-5 h-5 text-[#16A34A]" />
            <h2 className="text-base font-black text-gray-900">Add New Farm</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Farm Name *</label>
            <Input value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g. Mama's Rice Farm, Bako Farm" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">State *</label>
              <select value={form.state} onChange={(e) => setForm(f => ({...f, state: e.target.value}))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]">
                <option value="">Select</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">LGA / Town</label>
              <Input value={form.lga} onChange={(e) => setForm(f => ({...f, lga: e.target.value}))}
                placeholder="e.g. Damboa" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Size (hectares) *</label>
              <Input type="number" min="0.1" step="0.1" value={form.sizeHectares}
                onChange={(e) => setForm(f => ({...f, sizeHectares: e.target.value}))}
                placeholder="e.g. 2.5" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Farm Type</label>
              <select value={form.farmType} onChange={(e) => setForm(f => ({...f, farmType: e.target.value}))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none">
                {FARM_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Soil Type</label>
              <select value={form.soilType} onChange={(e) => setForm(f => ({...f, soilType: e.target.value}))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none">
                {SOIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Water Source</label>
              <select value={form.irrigationType} onChange={(e) => setForm(f => ({...f, irrigationType: e.target.value}))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none">
                {IRRIGATION_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full h-13 rounded-2xl bg-[#16A34A] hover:bg-green-700 text-white font-black">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Register Farm</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddCropModal({ farms, onClose, onSaved }: { farms: any[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farmId: farms[0]?.id?.toString() ?? "",
    name: "",
    variety: "",
    stage: "planted",
    plantingDate: new Date().toISOString().split("T")[0],
    expectedHarvestDate: "",
    plotSizeHectares: "",
    expectedYieldKg: "",
    notes: "",
  });

  const handleSave = async () => {
    if (!form.farmId) { toast({ title: "Select a farm", variant: "destructive" }); return; }
    if (!form.name) { toast({ title: "Select a crop type", variant: "destructive" }); return; }
    if (!form.plotSizeHectares || isNaN(Number(form.plotSizeHectares)) || Number(form.plotSizeHectares) <= 0) {
      toast({ title: "Enter a valid plot size", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await apiFetch("/crops", {
        method: "POST",
        body: JSON.stringify({
          farmId: Number(form.farmId),
          name: form.name,
          variety: form.variety.trim() || undefined,
          stage: form.stage,
          plantingDate: form.plantingDate || undefined,
          expectedHarvestDate: form.expectedHarvestDate || undefined,
          plotSizeHectares: Number(form.plotSizeHectares),
          expectedYieldKg: form.expectedYieldKg ? Number(form.expectedYieldKg) : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      toast({ title: "Crop added!", description: `${form.name} has been recorded.` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Failed to add crop", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-[#16A34A]" />
            <h2 className="text-base font-black text-gray-900">Add Crop</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Select Farm *</label>
            <select value={form.farmId} onChange={(e) => setForm(f => ({...f, farmId: e.target.value}))}
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]">
              {farms.map(fa => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Crop Type *</label>
              <select value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]">
                <option value="">Select crop</option>
                {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Variety / Local Name</label>
              <Input value={form.variety} onChange={(e) => setForm(f => ({...f, variety: e.target.value}))}
                placeholder="e.g. FARO 44, Ife Brown" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Growth Stage</label>
            <div className="grid grid-cols-3 gap-2">
              {CROP_STAGES.map(s => (
                <button key={s} onClick={() => setForm(f => ({...f, stage: s}))}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${
                    form.stage === s ? "bg-[#16A34A] text-white border-[#16A34A]" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Planting Date
              </label>
              <Input type="date" value={form.plantingDate} onChange={(e) => setForm(f => ({...f, plantingDate: e.target.value}))}
                className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Expected Harvest</label>
              <Input type="date" value={form.expectedHarvestDate} onChange={(e) => setForm(f => ({...f, expectedHarvestDate: e.target.value}))}
                className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Plot Size (ha) *</label>
              <Input type="number" min="0.1" step="0.1" value={form.plotSizeHectares}
                onChange={(e) => setForm(f => ({...f, plotSizeHectares: e.target.value}))}
                placeholder="e.g. 1.5" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Expected Yield (kg)</label>
              <Input type="number" min="0" value={form.expectedYieldKg}
                onChange={(e) => setForm(f => ({...f, expectedYieldKg: e.target.value}))}
                placeholder="e.g. 2000" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Notes / Observations</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({...f, notes: e.target.value}))}
              placeholder="Any observations, problems, or extra info..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] resize-none" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full h-13 rounded-2xl bg-[#16A34A] hover:bg-green-700 text-white font-black">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Add Crop</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddLivestockModal({ farms, onClose, onSaved }: { farms: any[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farmId: farms[0]?.id?.toString() ?? "",
    species: "",
    breed: "",
    count: "",
    nextVaccinationDate: "",
    notes: "",
  });

  const handleSave = async () => {
    if (!form.farmId) { toast({ title: "Select a farm", variant: "destructive" }); return; }
    if (!form.species) { toast({ title: "Select animal type", variant: "destructive" }); return; }
    if (!form.count || isNaN(Number(form.count)) || Number(form.count) <= 0) {
      toast({ title: "Enter a valid animal count", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await apiFetch("/livestock", {
        method: "POST",
        body: JSON.stringify({
          farmId: Number(form.farmId),
          species: form.species,
          breed: form.breed.trim() || "Local Breed",
          count: Number(form.count),
          nextVaccinationDate: form.nextVaccinationDate || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      toast({ title: "Livestock added!", description: `${form.count} ${form.species}(s) recorded.` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Failed to add livestock", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1E3A8A]" />
            <h2 className="text-base font-black text-gray-900">Add Livestock</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Select Farm *</label>
            <select value={form.farmId} onChange={(e) => setForm(f => ({...f, farmId: e.target.value}))}
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]">
              {farms.map(fa => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Animal Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {LIVESTOCK_SPECIES.map(s => (
                <button key={s} onClick={() => setForm(f => ({...f, species: s}))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border text-left transition-colors ${
                    form.species === s ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Breed (optional)</label>
              <Input value={form.breed} onChange={(e) => setForm(f => ({...f, breed: e.target.value}))}
                placeholder="e.g. Gudali, Kano Brown" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Number of Animals *</label>
              <Input type="number" min="1" value={form.count} onChange={(e) => setForm(f => ({...f, count: e.target.value}))}
                placeholder="e.g. 20" className="h-11 rounded-xl border-gray-200 bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />Next Vaccination Date
            </label>
            <Input type="date" value={form.nextVaccinationDate}
              onChange={(e) => setForm(f => ({...f, nextVaccinationDate: e.target.value}))}
              className="h-11 rounded-xl border-gray-200 bg-gray-50" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({...f, notes: e.target.value}))}
              placeholder="Health issues, feeding notes, etc."
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] resize-none" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full h-13 rounded-2xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-black">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Add Livestock</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AiFarmManagement({ farms, crops, livestock }: { farms: any[]; crops: any[]; livestock: any[] }) {
  const { toast } = useToast();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any | null>(null);
  const [tasksDone, setTasksDone] = useState<Set<number>>(new Set());

  const getFarmAiAdvice = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const farmSummary = {
        farms: farms.map(f => ({ name: f.name, size: f.sizeHectares, state: f.state, soil: f.soilType, irrigation: f.irrigationType, health: f.healthScore })),
        crops: crops.map(c => ({ name: c.name, variety: c.variety, stage: c.stage, health: c.healthScore, plotSize: c.plotSizeHectares, plantingDate: c.plantingDate, harvestDate: c.expectedHarvestDate })),
        livestock: livestock.map(l => ({ species: l.species, count: l.count, health: l.healthScore, vaccination: l.nextVaccinationDate })),
      };
      const res = await fetch("/api/farmgpt/conversations", {
        method: "GET",
        headers: { "Authorization": `Bearer ${localStorage.getItem(TOKEN_KEY)}`, "Content-Type": "application/json" },
      });
      const convos = await res.json();
      let convId = convos[0]?.id;
      if (!convId) {
        const cr = await apiFetch("/farmgpt/conversations", { method: "POST", body: JSON.stringify({ title: "AI Farm Plan", language: "English" }) });
        convId = cr.id;
      }

      const prompt = `Based on my farm data, give me a detailed AI farm management plan for this week:

Farm Summary:
${JSON.stringify(farmSummary, null, 2)}

Please provide:
1. Top 3 priority tasks for this week (with specific actions)
2. Health alerts or warnings I should act on immediately
3. One key recommendation to improve my farm yield or income this month

Format as JSON: {"tasks":[{"title":"...","urgency":"high/medium/low","action":"...","reason":"..."}],"alerts":["..."],"recommendation":"..."}`;

      const msgRes = await fetch(`/api/farmgpt/conversations/${convId}/messages/stream`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem(TOKEN_KEY)}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: prompt, language: "English" }),
      });

      const reader = msgRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk") fullText += data.text;
            else if (data.type === "done") { fullText = data.message?.content || fullText; }
          } catch {}
        }
      }

      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setAiAdvice(parsed);
        } else {
          setAiAdvice({ tasks: [], alerts: [], recommendation: fullText });
        }
      } catch {
        setAiAdvice({ tasks: [], alerts: [], recommendation: fullText });
      }
    } catch (err: any) {
      toast({ title: "Could not get AI advice", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const hasData = farms.length > 0;

  if (!hasData) {
    return (
      <div className="px-4 pt-4 pb-8">
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <Bot className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-600 mb-1">No farm data yet</p>
            <p className="text-xs text-gray-400 leading-relaxed">Add your farms, crops, and livestock first to get AI-powered farm management plans.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bot className="w-8 h-8 text-blue-200 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-black text-sm mb-1">AI Farm Manager</h3>
              <p className="text-blue-200 text-xs leading-relaxed mb-3">
                Get a personalized action plan for your {farms.length} farm(s), {crops.length} crop(s), and {livestock.length} livestock group(s).
              </p>
              <Button size="sm" onClick={getFarmAiAdvice} disabled={aiLoading}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-xs h-9 rounded-xl px-4">
                {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generating plan...</> : "Generate My Farm Plan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {aiLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      )}

      {aiAdvice && (
        <>
          {aiAdvice.alerts?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-black text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Urgent Alerts
              </h3>
              {aiAdvice.alerts.map((alert: string, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">{alert}</p>
                </div>
              ))}
            </div>
          )}

          {aiAdvice.tasks?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-black text-gray-900">This Week's Tasks</h3>
              {aiAdvice.tasks.map((task: any, i: number) => (
                <Card key={i} className={`rounded-2xl border-0 shadow-sm transition-all ${tasksDone.has(i) ? "opacity-60" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => setTasksDone(d => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          tasksDone.has(i) ? "bg-[#16A34A] border-[#16A34A]" : "border-gray-300"}`}>
                        {tasksDone.has(i) && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm font-bold text-gray-900 ${tasksDone.has(i) ? "line-through text-gray-400" : ""}`}>{task.title}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                            task.urgency === "high" ? "bg-red-100 text-red-600" :
                            task.urgency === "medium" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                          }`}>{task.urgency}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{task.action}</p>
                        {task.reason && <p className="text-[10px] text-gray-400 mt-1 leading-tight">{task.reason}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {aiAdvice.recommendation && (
            <Card className="rounded-2xl border-0 bg-green-50 shadow-sm">
              <CardContent className="p-4 flex gap-3">
                <Bot className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#16A34A] mb-1">Key Recommendation for This Month</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{aiAdvice.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function Farm() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [showAddLivestock, setShowAddLivestock] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: farms, isLoading: farmsLoading } = useGetFarms({ query: { queryKey: getGetFarmsQueryKey() } });
  const { data: crops, isLoading: cropsLoading } = useGetCrops({ query: { queryKey: getGetCropsQueryKey() } });
  const { data: livestock, isLoading: livestockLoading } = useGetLivestock({ query: { queryKey: getGetLivestockQueryKey() } });
  const { data: climate, isLoading: climateLoading } = useGetClimateForecast({ query: { queryKey: getGetClimateForecastQueryKey() } });
  const { data: farmSummary } = useGetFarmSummary({ query: { queryKey: getGetFarmSummaryQueryKey() } });
  const { data: livestockSummary } = useGetLivestockSummary({ query: { queryKey: getGetLivestockSummaryQueryKey() } });

  const avgCropHealth = crops?.length
    ? Math.round(crops.reduce((s, c) => s + ((c as any).healthScore ?? 0), 0) / crops.length)
    : 0;
  const avgLivestockHealth = livestock?.length
    ? Math.round(livestock.reduce((s, l) => s + ((l as any).healthScore ?? 0), 0) / livestock.length)
    : 0;
  const soilHealth = farmSummary?.avgHealthScore ? Math.min(100, Math.round(farmSummary.avgHealthScore * 0.93)) : 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "crops", label: "Crops" },
    { id: "livestock", label: "Animals" },
    { id: "climate", label: "Climate" },
    { id: "ai", label: "AI Plan" },
    { id: "season", label: "Season" },
  ];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetFarmsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCropsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLivestockQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFarmSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLivestockSummaryQueryKey() });
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Farm Management</h1>
            <p className="text-xs text-gray-500">Track your operations, crops & livestock</p>
          </div>
          <Button size="sm" onClick={() => setShowAddFarm(true)}
            className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl gap-1 px-3">
            <Plus className="w-3.5 h-3.5" /> Add Farm
          </Button>
        </div>
        <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 py-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id ? "border-[#16A34A] text-[#16A34A]" : "border-transparent text-gray-400"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {farmsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : farms && farms.length > 0 && farmSummary ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Number of Farms</p>
                    <p className="text-2xl font-black text-[#16A34A]">{farmSummary.totalFarms}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Farm Size</p>
                    <p className="text-2xl font-black text-[#1E3A8A]">{farmSummary.totalHectares}<span className="text-sm font-bold"> ha</span></p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Farm Health Overview</h3>
                    <span className="text-xs text-[#16A34A] font-bold">{farmSummary.avgHealthScore}/100</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1.5">🌾 Crop Health ({crops?.length ?? 0} crops)</p>
                      {avgCropHealth > 0 ? <HealthBar score={avgCropHealth} color="#16A34A" /> :
                        <p className="text-xs text-gray-300">No crops recorded</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1.5">🐄 Livestock Health ({livestock?.length ?? 0} groups)</p>
                      {avgLivestockHealth > 0 ? <HealthBar score={avgLivestockHealth} color="#1E3A8A" /> :
                        <p className="text-xs text-gray-300">No livestock recorded</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1.5">🌱 Soil Health</p>
                      {soilHealth > 0 ? <HealthBar score={soilHealth} color="#FBBF24" /> :
                        <p className="text-xs text-gray-300">Add a farm to track soil health</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

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
                  const color = s >= 75 ? "#16A34A" : s >= 50 ? "#FBBF24" : s > 0 ? "#ef4444" : "#94a3b8";
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
                            farm.farmType === "livestock" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
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
                            <p className="text-xs font-bold text-gray-900 truncate">{farm.soilType ?? "—"}</p>
                          </div>
                          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: color + "15" }}>
                            <p className="text-[10px] font-semibold" style={{ color }}>Health</p>
                            <p className="text-sm font-black" style={{ color }}>{s > 0 ? `${s}/100` : "—"}</p>
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
                  <p className="text-sm font-bold text-gray-500">No farms registered yet</p>
                  <p className="text-xs text-gray-400 mt-1 mb-3">Tap the button above to add your first farm</p>
                  <Button size="sm" onClick={() => setShowAddFarm(true)} className="bg-[#16A34A] text-white rounded-xl font-bold">
                    Add Your First Farm
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "crops" && (
        <div className="px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Crop Inventory</h2>
            <Button size="sm" onClick={() => farms?.length ? setShowAddCrop(true) : toast({ title: "Add a farm first", description: "You need to register a farm before adding crops." })}
              className="h-8 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl gap-1 px-3">
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
                        <Badge className={`${stageClass} border-0 text-[10px] font-bold capitalize`}>{crop.stage ?? "planted"}</Badge>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-400 font-semibold mb-1.5">
                          <span>Health Score</span>
                          <span className="font-black" style={{ color: healthColor }}>{crop.healthScore ?? "—"}/100</span>
                        </div>
                        {crop.healthScore ? <HealthBar score={crop.healthScore} color={healthColor} /> :
                          <div className="h-1.5 bg-gray-100 rounded-full" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[9px] text-gray-400 font-semibold uppercase">Plot</p>
                          <p className="text-xs font-black text-gray-900">{crop.plotSizeHectares}ha</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[9px] text-gray-400 font-semibold uppercase">Expected</p>
                          <p className="text-xs font-black text-gray-900">{crop.expectedYieldKg ? `${crop.expectedYieldKg.toLocaleString()} kg` : "—"}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[9px] text-gray-400 font-semibold uppercase">Harvest</p>
                          <p className="text-[10px] font-bold text-gray-700 truncate">
                            {crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "—"}
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
              <CardContent className="p-8 text-center">
                <Sprout className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-500">No crops recorded</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">Start tracking your crops to get health insights and market advice.</p>
                {farms?.length ? (
                  <Button size="sm" onClick={() => setShowAddCrop(true)} className="bg-[#16A34A] text-white rounded-xl font-bold">Add Your First Crop</Button>
                ) : (
                  <Button size="sm" onClick={() => setShowAddFarm(true)} className="bg-gray-600 text-white rounded-xl font-bold">Add a Farm First</Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "livestock" && (
        <div className="px-4 pt-4 pb-8">
          {livestockSummary && livestock && livestock.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card className="rounded-xl border-0 bg-white shadow-sm">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Animals</p>
                  <p className="text-2xl font-black text-[#1E3A8A]">{livestockSummary.totalAnimals}</p>
                </CardContent>
              </Card>
              <Card className={`rounded-xl border-0 shadow-sm ${(livestockSummary.vaccinationsDueSoon ?? 0) > 0 ? "bg-red-50" : "bg-white"}`}>
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Vaccinations Due</p>
                  <p className={`text-2xl font-black ${(livestockSummary.vaccinationsDueSoon ?? 0) > 0 ? "text-red-500" : "text-gray-300"}`}>
                    {livestockSummary.vaccinationsDueSoon ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Livestock Register</h2>
            <Button size="sm" onClick={() => farms?.length ? setShowAddLivestock(true) : toast({ title: "Add a farm first" })}
              className="h-8 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl gap-1 px-3">
              <Plus className="w-3.5 h-3.5" /> Add Animals
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
                      {animal.healthScore ? (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-gray-400 font-semibold mb-1.5">
                            <span>Health Score</span>
                            <span className="font-black" style={{ color: healthColor }}>{animal.healthScore}/100</span>
                          </div>
                          <HealthBar score={animal.healthScore} color={healthColor} />
                        </div>
                      ) : null}
                      {animal.nextVaccinationDate && (
                        <div className={`flex items-center gap-2 rounded-xl p-2.5 ${
                          new Date(animal.nextVaccinationDate) <= new Date(Date.now() + 7 * 86400000) ? "bg-red-50" : "bg-gray-50"}`}>
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                            new Date(animal.nextVaccinationDate) <= new Date(Date.now() + 7 * 86400000) ? "text-red-500" : "text-amber-500"}`} />
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
              <CardContent className="p-8 text-center">
                <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-500">No livestock recorded</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">Track your animals' health and vaccination schedules.</p>
                {farms?.length ? (
                  <Button size="sm" onClick={() => setShowAddLivestock(true)} className="bg-[#1E3A8A] text-white rounded-xl font-bold">Add Your Animals</Button>
                ) : (
                  <Button size="sm" onClick={() => setShowAddFarm(true)} className="bg-gray-600 text-white rounded-xl font-bold">Add a Farm First</Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "climate" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {climateLoading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : climate ? (
            <>
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
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {climate.forecast?.map((day: any, i: number) => (
                      <div key={i} className="flex flex-col items-center bg-white/10 backdrop-blur rounded-xl p-2.5 min-w-[56px]">
                        <span className="text-[10px] font-bold text-blue-200 mb-1.5">
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        {day.condition?.toLowerCase().includes("rain") ? <CloudRain className="w-4 h-4 text-blue-300 mb-1.5" />
                          : day.condition?.toLowerCase().includes("cloud") ? <Cloud className="w-4 h-4 text-gray-300 mb-1.5" />
                          : <Sun className="w-4 h-4 text-yellow-300 mb-1.5" />}
                        <span className="text-xs font-bold text-white">{day.highTemp}°</span>
                        <span className="text-[10px] text-blue-300">{day.lowTemp}°</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
                          <p className="text-sm font-black capitalize text-gray-900">{value ?? "Low"}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {climate.recommendations?.length > 0 && (
                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-4 h-4 text-[#16A34A]" />
                      <h3 className="text-sm font-bold text-gray-900">AI Weather Advice</h3>
                    </div>
                    <div className="space-y-2">
                      {climate.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                          <ChevronRight className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
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

      {activeTab === "ai" && (
        <AiFarmManagement farms={farms ?? []} crops={crops ?? []} livestock={livestock ?? []} />
      )}

      {activeTab === "season" && <SeasonPlanner />}

      {showAddFarm && (
        <AddFarmModal onClose={() => setShowAddFarm(false)} onSaved={() => { setShowAddFarm(false); refreshAll(); }} />
      )}
      {showAddCrop && farms && farms.length > 0 && (
        <AddCropModal farms={farms} onClose={() => setShowAddCrop(false)} onSaved={() => { setShowAddCrop(false); refreshAll(); }} />
      )}
      {showAddLivestock && farms && farms.length > 0 && (
        <AddLivestockModal farms={farms} onClose={() => setShowAddLivestock(false)} onSaved={() => { setShowAddLivestock(false); refreshAll(); }} />
      )}
    </div>
  );
}
