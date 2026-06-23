import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Wheat, ChevronRight, Loader2, Sprout,
  Check, TreePine, Fish, Feather,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const FARMING_TYPES = [
  { id: "crop", label: "Crop Farming", desc: "Grains, vegetables, fruits", Icon: Wheat, color: "bg-green-50 border-green-200 text-green-700" },
  { id: "livestock", label: "Livestock", desc: "Cattle, goats, sheep", Icon: TreePine, color: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "mixed", label: "Mixed Farming", desc: "Crops and animals together", Icon: Sprout, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "poultry", label: "Poultry", desc: "Chickens, turkeys, ducks", Icon: Feather, color: "bg-orange-50 border-orange-200 text-orange-700" },
  { id: "aquaculture", label: "Aquaculture", desc: "Fish and seafood farming", Icon: Fish, color: "bg-sky-50 border-sky-200 text-sky-700" },
];

type Step = "location" | "farm" | "done";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { farmer, saveOnboarding } = useAuth();

  const [step, setStep] = useState<Step>("location");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [farmingType, setFarmingType] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmSizeHa, setFarmSizeHa] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const steps: Step[] = ["location", "farm", "done"];
  const stepIndex = steps.indexOf(step);

  const handleLocationNext = () => {
    if (!state) { setError("Please select your state"); return; }
    setError("");
    setStep("farm");
  };

  const handleFarmNext = async () => {
    if (!farmingType) { setError("Please select your farming type"); return; }
    setError("");
    setIsLoading(true);
    try {
      await saveOnboarding({
        state,
        lga: lga || state,
        farmingType,
        farmName: farmName.trim() || `${farmer?.name ?? "My"}'s Farm`,
        farmSizeHa: farmSizeHa ? Number(farmSizeHa) : undefined,
      });
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A8A] to-[#16A34A] flex flex-col items-center justify-center px-5 py-10 max-w-[480px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full"
      >
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">
            {step === "done" ? "Welcome aboard!" : "Set up your farm"}
          </h1>
          <p className="text-white/70 text-sm">
            {step === "done"
              ? "Your personalized dashboard is ready"
              : `Step ${stepIndex + 1} of 2 — ${step === "location" ? "Your location" : "Your farm"}`}
          </p>
        </div>

        {/* Progress bar */}
        {step !== "done" && (
          <div className="flex gap-2 mb-6">
            {["location", "farm"].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i < stepIndex ? "bg-white" : i === stepIndex ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-6">
          <AnimatePresence mode="wait">

            {/* Step 1: Location */}
            {step === "location" && (
              <motion.div key="location" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-sm">Where is your farm?</h2>
                    <p className="text-xs text-gray-500">We use this for weather, alerts, and market prices</p>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">State *</label>
                  <select
                    value={state}
                    onChange={(e) => { setState(e.target.value); setError(""); }}
                    className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  >
                    <option value="">Select your state…</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">LGA / City <span className="font-normal text-gray-400">(optional)</span></label>
                  <Input
                    placeholder="e.g. Kano Municipal, Ikeja, Ibadan North"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    className="h-12 rounded-xl border-gray-200 text-sm"
                  />
                </div>

                <Button
                  onClick={handleLocationNext}
                  className="w-full h-12 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Farm details */}
            {step === "farm" && (
              <motion.div key="farm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Wheat className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-sm">Tell us about your farm</h2>
                    <p className="text-xs text-gray-500">This personalises your dashboard and AI advice</p>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">What type of farming do you do? *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {FARMING_TYPES.map(({ id, label, desc, Icon, color }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setFarmingType(id); setError(""); }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                          farmingType === id
                            ? "border-[#16A34A] bg-green-50"
                            : "border-gray-100 hover:border-gray-200 bg-gray-50"
                        )}
                      >
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color.split(" ").slice(0, 2).join(" "))}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        {farmingType === id && (
                          <div className="w-5 h-5 rounded-full bg-[#16A34A] flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Farm Name <span className="font-normal text-gray-400">(optional)</span></label>
                    <Input
                      placeholder="My Farm"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Size (hectares) <span className="font-normal text-gray-400">(optional)</span></label>
                    <Input
                      type="number"
                      placeholder="e.g. 2.5"
                      value={farmSizeHa}
                      onChange={(e) => setFarmSizeHa(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 text-sm"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("location")}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleFarmNext}
                    disabled={isLoading}
                    className="flex-1 h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finish Setup"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="text-center py-4 space-y-5"
              >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-14 h-14 bg-[#16A34A] rounded-full flex items-center justify-center">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">You're all set, {farmer?.name?.split(" ")[0]}!</h2>
                  <p className="text-sm text-gray-500">
                    Your personalised dashboard is ready. Add your crops, livestock, and farm records to unlock the full power of FREGE AI.
                  </p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-left space-y-2">
                  {[
                    "🌱 Add your first crop or livestock",
                    "📊 Track farm health and yields",
                    "💬 Connect with nearby farmers",
                    "🏦 Build your NeuroScore for loans",
                  ].map((tip) => (
                    <p key={tip} className="text-sm text-green-800 font-medium">{tip}</p>
                  ))}
                </div>
                <Button
                  onClick={() => setLocation("/home")}
                  className="w-full h-12 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl text-base"
                >
                  Go to My Dashboard
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
