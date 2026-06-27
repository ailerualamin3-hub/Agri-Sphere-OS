import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Camera, Upload, Sprout, Activity, Zap,
  CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Loader2, ChevronRight, FlaskConical, Leaf, Lock, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ScanType = "crop" | "animal" | "soil" | null;
type ScanState = "select" | "capture" | "analyzing" | "results" | "paywall";

const SCAN_CONFIGS = {
  crop: {
    label: "Crop Scan",
    description: "Diagnose plant diseases, nutrient deficiencies, and pest damage",
    icon: Sprout,
    color: "text-[#16A34A]",
    bg: "bg-green-50",
    gradient: "from-green-600 to-green-500",
    accentColor: "#16A34A",
    tips: ["Take photo in good lighting", "Focus on affected leaf or stem", "Include both healthy and affected parts"],
  },
  animal: {
    label: "Animal Scan",
    description: "Detect livestock diseases, assess body condition, and identify symptoms",
    icon: Activity,
    color: "text-[#1E3A8A]",
    bg: "bg-blue-50",
    gradient: "from-blue-800 to-blue-700",
    accentColor: "#1E3A8A",
    tips: ["Photograph the full animal body", "Capture any visible symptoms", "Ensure animal is standing still"],
  },
  soil: {
    label: "Soil Scan",
    description: "Identify soil type, check health indicators, and get crop recommendations",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    gradient: "from-amber-600 to-amber-500",
    accentColor: "#d97706",
    tips: ["Use fresh soil sample", "Photograph in natural light", "Include soil texture in frame"],
  },
};

const API_BASE = "/api";
function authFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("frege_auth_token");
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
}

const FREE_LIMIT = 5;

export default function Scan() {
  const [, setLocation] = useLocation();
  const [scanType, setScanType] = useState<ScanType>(null);
  const [scanState, setScanState] = useState<ScanState>("select");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const r = await authFetch("/scan/credits");
      if (r.ok) {
        const data = await r.json();
        setCredits(data);
        if (data.remaining === 0) setScanState("paywall");
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const handleScanTypeSelect = (type: ScanType) => {
    if (credits && credits.remaining === 0) {
      setScanState("paywall");
      return;
    }
    setScanType(type);
    setScanState("capture");
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (credits && credits.remaining === 0) {
        setScanState("paywall");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setScanState("analyzing");
        setAnalysisProgress(0);
        setError(null);

        // Animate progress while waiting for API
        const interval = setInterval(() => {
          setAnalysisProgress((p) => (p < 88 ? p + Math.random() * 12 : p));
        }, 500);

        try {
          const r = await authFetch("/scan/analyze", {
            method: "POST",
            body: JSON.stringify({
              scanType,
              imageBase64: base64,
              mimeType: file.type || "image/jpeg",
            }),
          });

          clearInterval(interval);

          if (r.status === 402) {
            setScanState("paywall");
            setCredits({ used: FREE_LIMIT, limit: FREE_LIMIT, remaining: 0 });
            return;
          }

          const data = await r.json();

          if (!r.ok) {
            setError(data.error || "Analysis failed. Please try again.");
            setScanState("capture");
            return;
          }

          setAnalysisProgress(100);
          // Map API response to display format
          const mapped = {
            diagnosis: data.diagnosis,
            confidence: data.confidence,
            severity: data.severity,
            severityLevel:
              data.severity === "Good"
                ? "good"
                : data.severity === "Moderate"
                ? "warning"
                : "critical",
            description: data.description,
            recommendations: (data.recommendations || []).map((r: string, i: number) => ({
              action: r,
              urgency: i === 0 ? "urgent" : i === 1 ? "high" : "medium",
              icon: i % 3 === 0 ? FlaskConical : i % 3 === 1 ? Leaf : Sprout,
            })),
            additionalInfo: data.additionalInfo || [],
          };
          setTimeout(() => {
            setResults(mapped);
            setScanState("results");
            setCredits((prev) =>
              prev ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) } : prev
            );
          }, 400);
        } catch (err) {
          clearInterval(interval);
          setError("Network error. Please check your connection and try again.");
          setScanState("capture");
        }
      };
      reader.readAsDataURL(file);
    },
    [scanType, credits]
  );

  const handleReset = () => {
    if (credits && credits.remaining === 0) {
      setScanState("paywall");
      return;
    }
    setScanType(null);
    setScanState("select");
    setSelectedImage(null);
    setAnalysisProgress(0);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const config = scanType ? SCAN_CONFIGS[scanType] : null;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        {scanState !== "select" && scanState !== "paywall" ? (
          <button onClick={handleReset} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
        ) : null}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            {scanState === "select" || scanState === "paywall" ? "Smart Scan" : config?.label}
          </h1>
          <p className="text-xs text-gray-500">
            {scanState === "select" || scanState === "paywall"
              ? "AI-powered agricultural diagnostics"
              : config?.description}
          </p>
        </div>
        {credits && scanState !== "paywall" && (
          <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl ${credits.remaining === 0 ? "bg-red-50" : "bg-green-50"}`}>
            <span className={`text-base font-black ${credits.remaining === 0 ? "text-red-500" : "text-[#16A34A]"}`}>
              {credits.remaining}
            </span>
            <span className="text-[8px] font-semibold text-gray-400 leading-none">scans left</span>
          </div>
        )}
      </div>

      {/* Paywall Screen */}
      {scanState === "paywall" && (
        <div className="px-4 pt-8 pb-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <Lock className="w-12 h-12 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">5 Free Scans Used</h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed mb-6 px-4">
            You've used all your free Farm Check scans. Upgrade to Pro to get unlimited AI crop, animal and soil analysis.
          </p>

          <Card className="w-full rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg mb-4">
            <CardContent className="p-5 text-white">
              <p className="text-xs font-bold text-blue-200 uppercase mb-3">Choose your plan</p>
              <div className="space-y-2.5">
                {[
                  { label: "Monthly", price: "₦20,000", sub: "/month" },
                  { label: "3 Months", price: "₦59,000", sub: " (save 2%)", highlight: true },
                  { label: "Yearly", price: "₦75,000", sub: "/year (save 69%)", highlight: false },
                ].map((plan) => (
                  <div
                    key={plan.label}
                    className={`flex items-center justify-between rounded-xl p-3 ${plan.highlight ? "bg-white/20" : "bg-white/10"}`}
                  >
                    <span className="text-sm font-bold">{plan.label}</span>
                    <span className="text-sm font-black">
                      {plan.price}
                      <span className="text-xs font-normal text-blue-200">{plan.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="w-full space-y-2.5 mb-4">
            {[
              "Unlimited crop, animal & soil scans",
              "Full AI diagnosis with treatment plans",
              "Scan history & progress tracking",
              "Priority FarmGPT responses",
              "All government grant details",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setLocation("/payment")}
            className="w-full h-14 rounded-2xl bg-[#16A34A] hover:bg-green-700 text-white font-black text-base shadow-lg"
          >
            Upgrade to Pro Now
          </Button>
          <p className="text-xs text-gray-400 mt-3">Cancel anytime. Secure payment.</p>
        </div>
      )}

      {/* Scan Type Selection */}
      {scanState === "select" && (
        <div className="px-4 pt-6 pb-8">
          {credits && (
            <div className={`w-full rounded-2xl p-3.5 mb-5 flex items-center gap-3 ${
              credits.remaining <= 1 ? "bg-red-50" : "bg-green-50"
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                credits.remaining <= 1 ? "bg-red-100" : "bg-green-100"
              }`}>
                <Star className={`w-5 h-5 ${credits.remaining <= 1 ? "text-red-500" : "text-[#16A34A]"}`} />
              </div>
              <div>
                <p className={`text-sm font-black ${credits.remaining <= 1 ? "text-red-600" : "text-[#16A34A]"}`}>
                  {credits.remaining} of {credits.limit} free scans remaining
                </p>
                <p className="text-xs text-gray-500">
                  {credits.remaining === 0
                    ? "Upgrade to Pro for unlimited scans"
                    : credits.remaining <= 2
                    ? "Running low — consider upgrading"
                    : "Each scan uses AI to analyse your farm"}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {(["crop", "animal", "soil"] as ScanType[]).map((type) => {
              if (!type) return null;
              const cfg = SCAN_CONFIGS[type];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleScanTypeSelect(type)}
                  className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
                >
                  <div className={`w-16 h-16 rounded-2xl ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{cfg.label}</h3>
                      <Badge className={`text-[10px] font-bold border-0 ${cfg.bg} ${cfg.color}`}>AI</Badge>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{cfg.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                </button>
              );
            })}
          </div>

          <Card className="mt-6 rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
            <CardContent className="p-5 text-white">
              <h3 className="font-bold text-sm mb-1">How Smart Scan Works</h3>
              <p className="text-xs text-blue-200 leading-relaxed mb-3">
                Our AI analyses images of your crops, animals, or soil to detect issues, identify diseases, and provide targeted recommendations.
              </p>
              <div className="space-y-2">
                {["Upload or take a photo", "Gemini AI analyses in seconds", "Get diagnosis & treatment plan"].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-blue-100">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Capture Screen */}
      {scanState === "capture" && config && (
        <div className="px-4 pt-6 pb-8">
          {error && (
            <div className="bg-red-50 rounded-xl p-3 mb-4 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 font-semibold">{error}</p>
            </div>
          )}
          <div
            className={`w-full aspect-square rounded-3xl bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center mb-6 relative overflow-hidden shadow-xl`}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Ready to Scan</p>
            <p className="text-white/70 text-xs text-center px-8">
              Position your{" "}
              {scanType === "crop" ? "plant/leaf" : scanType === "animal" ? "livestock" : "soil sample"} in the
              frame
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Photo Tips</h3>
            {config.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 mb-2 last:mb-0">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">{tip}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

            <Button
              onClick={() => cameraInputRef.current?.click()}
              className={`h-14 rounded-2xl font-bold text-sm bg-gradient-to-br ${config.gradient} border-0 shadow-lg flex items-center gap-2`}
            >
              <Camera className="w-5 h-5" /> Take Photo
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-14 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-700 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" /> Upload Image
            </Button>
          </div>
        </div>
      )}

      {/* Analyzing Screen */}
      {scanState === "analyzing" && config && (
        <div className="px-4 pt-12 pb-8 flex flex-col items-center">
          {selectedImage && (
            <div className="w-48 h-48 rounded-3xl overflow-hidden mb-8 shadow-xl">
              <img src={selectedImage} alt="Scan preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="relative w-32 h-32 mb-6">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} opacity-10 animate-ping`} />
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-xl`}
            >
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">Analysing...</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">
            Gemini AI is processing your {config.label.toLowerCase()}
          </p>

          <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-600">Analysis Progress</span>
              <span className="text-xs font-bold" style={{ color: config.accentColor }}>
                {Math.round(analysisProgress)}%
              </span>
            </div>
            <Progress value={analysisProgress} className="h-2 bg-gray-100" />
            <div className="mt-3 space-y-1.5">
              {[
                { step: "Loading AI models", threshold: 25 },
                { step: "Processing image features", threshold: 50 },
                { step: "Comparing disease patterns", threshold: 75 },
                { step: "Generating recommendations", threshold: 95 },
              ].map(({ step, threshold }) => (
                <div key={step} className="flex items-center gap-2 text-xs">
                  {analysisProgress >= threshold ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : analysisProgress >= threshold - 25 ? (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" />
                  )}
                  <span className={analysisProgress >= threshold ? "text-gray-800 font-medium" : "text-gray-400"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Screen */}
      {scanState === "results" && results && config && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {selectedImage && (
            <div className="relative w-full h-40 rounded-2xl overflow-hidden shadow-sm">
              <img src={selectedImage} alt="Analysed" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                <span className="text-white text-xs font-semibold">Analysed Image</span>
              </div>
            </div>
          )}

          {/* Diagnosis Header */}
          <Card
            className={`rounded-2xl border-0 shadow-sm ${
              results.severityLevel === "good"
                ? "bg-green-50"
                : results.severityLevel === "warning"
                ? "bg-amber-50"
                : "bg-red-50"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    results.severityLevel === "good"
                      ? "bg-green-100"
                      : results.severityLevel === "warning"
                      ? "bg-amber-100"
                      : "bg-red-100"
                  }`}
                >
                  {results.severityLevel === "good" ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : results.severityLevel === "warning" ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-black text-gray-900 text-sm leading-tight">{results.diagnosis}</h3>
                    <Badge
                      className={`shrink-0 text-[10px] font-bold border-0 ${
                        results.severityLevel === "good"
                          ? "bg-green-200 text-green-800"
                          : results.severityLevel === "warning"
                          ? "bg-amber-200 text-amber-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {results.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          results.severityLevel === "good"
                            ? "bg-green-500"
                            : results.severityLevel === "warning"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${results.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700">{results.confidence}% confidence</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{results.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Info */}
          {results.additionalInfo?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {results.additionalInfo.map((info: any, i: number) => (
                <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">{info.label}</p>
                    <p className="text-xs font-bold text-gray-900">{info.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Recommended Actions</h3>
            <div className="space-y-2">
              {results.recommendations.map((rec: any, i: number) => {
                const Icon = rec.icon;
                return (
                  <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                    <CardContent className="p-3.5 flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          rec.urgency === "urgent"
                            ? "bg-red-50 text-red-500"
                            : rec.urgency === "high"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-900 leading-tight">{rec.action}</p>
                      </div>
                      <Badge
                        className={`text-[9px] font-bold border-0 shrink-0 ${
                          rec.urgency === "urgent"
                            ? "bg-red-100 text-red-700"
                            : rec.urgency === "high"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {rec.urgency}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Credits remaining */}
          {credits && credits.remaining > 0 && (
            <Card className="rounded-xl border-0 bg-gray-50 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-[#16A34A]">{credits.remaining}</span> free scan{credits.remaining !== 1 ? "s" : ""} remaining
                </p>
              </CardContent>
            </Card>
          )}

          {/* FarmGPT CTA */}
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
            <CardContent className="p-4 text-white">
              <p className="text-sm font-bold mb-1">Need more guidance?</p>
              <p className="text-xs text-blue-200 mb-3">
                Ask FarmGPT for detailed treatment advice based on your specific situation.
              </p>
              <Button
                onClick={() => setLocation("/farmgpt")}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm h-9 w-full rounded-xl"
              >
                Ask FarmGPT
              </Button>
            </CardContent>
          </Card>

          {/* Scan Again */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full h-12 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Scan Again
          </Button>
        </div>
      )}
    </div>
  );
}
