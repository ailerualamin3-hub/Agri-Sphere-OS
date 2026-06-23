import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Camera, Upload, Sprout, Activity, Zap,
  CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Loader2, ChevronRight, FlaskConical, Leaf, Clock,
  ScanLine, ArrowLeft, History, Lock, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type ScanType = "crop" | "animal" | "soil" | null;
type ScanState = "select" | "capture" | "analyzing" | "results";
type ActiveTab = "scan" | "history";

const TOKEN_KEY = "frege_auth_token";

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "Request failed") as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const SCAN_CONFIGS = {
  crop: {
    label: "Crop Check",
    description: "Spot plant diseases, nutrient problems, and pest damage on your crops",
    icon: Sprout,
    color: "text-[#16A34A]",
    bg: "bg-green-50",
    gradient: "from-green-600 to-green-500",
    accentColor: "#16A34A",
    tips: ["Take photo in natural daylight", "Focus on the sick leaf or stem", "Show both healthy and affected parts"],
  },
  animal: {
    label: "Animal Check",
    description: "Check your livestock for diseases, injuries, and health problems",
    icon: Activity,
    color: "text-[#1E3A8A]",
    bg: "bg-blue-50",
    gradient: "from-blue-800 to-blue-700",
    accentColor: "#1E3A8A",
    tips: ["Show the full body of the animal", "Capture any visible signs of sickness", "Keep the animal still for a clear photo"],
  },
  soil: {
    label: "Soil Check",
    description: "Understand your soil type and get the right crop and fertilizer advice",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    gradient: "from-amber-600 to-amber-500",
    accentColor: "#d97706",
    tips: ["Use a fresh soil sample from your farm", "Photograph in natural light", "Show the texture and color clearly"],
  },
};

const FREE_LIMIT = 5;

function SeverityIcon({ level }: { level: string }) {
  if (level === "good" || level === "Good") return <CheckCircle className="w-6 h-6 text-green-600" />;
  if (level === "warning" || level === "Moderate") return <AlertTriangle className="w-6 h-6 text-amber-600" />;
  return <XCircle className="w-6 h-6 text-red-500" />;
}

function severityToLevel(severity: string): "good" | "warning" | "critical" {
  if (severity === "Good") return "good";
  if (severity === "Moderate") return "warning";
  return "critical";
}

function CreditBanner({ used, limit }: { used: number; limit: number }) {
  const remaining = limit - used;
  const pct = (used / limit) * 100;
  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-700">Free Scans</span>
        <span className={`text-xs font-black ${remaining === 0 ? "text-red-500" : remaining <= 2 ? "text-amber-600" : "text-[#16A34A]"}`}>
          {remaining} of {limit} remaining
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${remaining === 0 ? "bg-red-400" : remaining <= 2 ? "bg-amber-400" : "bg-[#16A34A]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {remaining === 0 && (
        <p className="text-[10px] text-red-500 font-semibold mt-1.5">You've used all free scans. Upgrade to continue.</p>
      )}
      {remaining > 0 && remaining <= 2 && (
        <p className="text-[10px] text-amber-600 font-semibold mt-1.5">Almost out — upgrade for unlimited scans.</p>
      )}
    </div>
  );
}

function Paywall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="px-4 pt-6 pb-8">
      <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-xl overflow-hidden">
        <CardContent className="p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black mb-2">Free Scans Used Up</h2>
          <p className="text-sm text-blue-200 mb-5 leading-relaxed">
            You've used all 5 free Farm Checks. Upgrade to get unlimited scans, priority AI analysis, and detailed farm reports.
          </p>
          <div className="space-y-2 mb-5 text-left">
            {["Unlimited crop, animal & soil checks", "Faster AI analysis", "Full farm history & reports", "FarmGPT priority access"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-blue-100">
                <Star className="w-4 h-4 text-amber-300 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Button
            onClick={onUpgrade}
            className="w-full h-12 bg-white text-[#1E3A8A] hover:bg-blue-50 font-black text-sm rounded-2xl"
          >
            Upgrade — Coming Soon
          </Button>
          <p className="text-[10px] text-blue-300 mt-3">Contact support to get early access</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Diagnose() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("scan");
  const [scanType, setScanType] = useState<ScanType>(null);
  const [scanState, setScanState] = useState<ScanState>("select");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [results, setResults] = useState<any | null>(null);
  const [credits, setCredits] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/scan/credits")
      .then(setCredits)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      setHistoryLoading(true);
      apiFetch("/scan/history")
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab]);

  const handleScanTypeSelect = (type: ScanType) => {
    if (credits && credits.remaining === 0) {
      toast({ title: "No scans remaining", description: "Upgrade to continue scanning.", variant: "destructive" });
      return;
    }
    setScanType(type);
    setScanState("capture");
  };

  const runProgressAnimation = useCallback((onComplete: () => void) => {
    setScanState("analyzing");
    setAnalysisProgress(0);
    const steps = [8, 20, 35, 52, 68, 80, 90, 95];
    steps.forEach((step, i) => {
      setTimeout(() => setAnalysisProgress(step), i * 400);
    });
    return onComplete;
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scanType) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageBase64 = reader.result as string;
      setSelectedImage(imageBase64);
      setIsAnalyzing(true);
      runProgressAnimation(() => {});

      try {
        const result = await apiFetch("/scan/analyze", {
          method: "POST",
          body: JSON.stringify({
            scanType,
            imageBase64,
            mimeType: file.type || "image/jpeg",
          }),
        });

        setAnalysisProgress(100);
        setTimeout(() => {
          setResults(result);
          setScanState("results");
          setCredits((prev) => prev ? { ...prev, used: result.creditsUsed, remaining: result.creditsRemaining } : prev);
          setIsAnalyzing(false);
        }, 500);
      } catch (err: any) {
        setIsAnalyzing(false);
        if (err.status === 402) {
          toast({ title: "No scans remaining", description: "Upgrade to continue.", variant: "destructive" });
          setCredits((prev) => prev ? { ...prev, remaining: 0 } : prev);
          setScanState("select");
        } else {
          toast({ title: "Analysis failed", description: err.message || "Please try again with a clearer photo.", variant: "destructive" });
          setScanState("capture");
        }
      }
    };
    reader.readAsDataURL(file);
  }, [scanType, runProgressAnimation, toast]);

  const handleReset = () => {
    setScanType(null);
    setScanState("select");
    setSelectedImage(null);
    setAnalysisProgress(0);
    setResults(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const config = scanType ? SCAN_CONFIGS[scanType] : null;
  const severityLevel = results ? severityToLevel(results.severity) : "good";

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          {scanState !== "select" ? (
            <button onClick={handleReset} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          ) : null}
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {scanState === "select" ? "Farm Check" : config?.label}
            </h1>
            <p className="text-xs text-gray-500">
              {scanState === "select" ? "Take a photo, get instant farm advice" : config?.description}
            </p>
          </div>
        </div>

        {scanState === "select" && (
          <div className="flex border-b border-gray-100">
            {(["scan", "history"] as ActiveTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors capitalize flex items-center justify-center gap-1.5 ${
                  activeTab === t ? "border-[#16A34A] text-[#16A34A]" : "border-transparent text-gray-400"
                }`}
              >
                {t === "scan" ? <ScanLine className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                {t === "scan" ? "New Check" : "History"}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === "scan" && scanState === "select" && (
        <>
          {credits && <CreditBanner used={credits.used} limit={credits.limit} />}

          {credits && credits.remaining === 0 ? (
            <Paywall onUpgrade={() => toast({ title: "Coming Soon", description: "Upgrade plans will be available soon. Contact support for early access." })} />
          ) : (
            <div className="px-4 pt-4 pb-8">
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
                  <h3 className="font-bold text-sm mb-1">How Farm Check Works</h3>
                  <p className="text-xs text-blue-200 leading-relaxed mb-3">
                    Take a photo of your crop, animal, or soil and our AI gives you a diagnosis and treatment plan in seconds — no lab needed.
                  </p>
                  <div className="space-y-2">
                    {["Take or upload a photo", "AI analyzes your farm", "Get diagnosis + treatment steps"].map((step, i) => (
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
        </>
      )}

      {activeTab === "history" && scanState === "select" && (
        <div className="px-4 pt-6 pb-8">
          {historyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((scan) => {
                const level = severityToLevel(scan.severity);
                return (
                  <Card key={scan.id} className="rounded-2xl border-0 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          level === "good" ? "bg-green-50" : level === "critical" ? "bg-red-50" : "bg-amber-50"
                        }`}>
                          {level === "good" ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                           level === "critical" ? <XCircle className="w-5 h-5 text-red-500" /> :
                           <AlertTriangle className="w-5 h-5 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{scan.diagnosis}</p>
                            <Badge className={`shrink-0 text-[10px] font-bold border-0 ${
                              level === "good" ? "bg-green-100 text-green-700" : level === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {scan.severity}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-gray-400 font-semibold mt-1 capitalize">
                            {scan.scanType === "crop" ? "Crop Check" : scan.scanType === "animal" ? "Animal Check" : "Soil Check"} · {scan.confidence}% confidence
                          </p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(scan.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          {scan.recommendations && scan.recommendations.length > 0 && (
                            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                              ↳ {typeof scan.recommendations[0] === "string" ? scan.recommendations[0] : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-500 mb-1">No checks done yet</p>
              <p className="text-xs text-gray-400 max-w-[200px]">Do your first Farm Check to see your history and track your farm health over time.</p>
              <Button
                onClick={() => setActiveTab("scan")}
                className="mt-4 bg-[#16A34A] text-white rounded-xl font-bold text-sm"
              >
                Start First Check
              </Button>
            </div>
          )}
        </div>
      )}

      {scanState === "capture" && config && (
        <div className="px-4 pt-6 pb-8">
          <div className={`w-full aspect-square rounded-3xl bg-gradient-to-br ${config.gradient} flex flex-col items-center justify-center mb-6 relative overflow-hidden shadow-xl`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Ready to Check</p>
            <p className="text-white/70 text-xs text-center px-8">
              Position your {scanType === "crop" ? "plant or leaf" : scanType === "animal" ? "livestock" : "soil sample"} in the frame
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Tips for a Good Photo</h3>
            {config.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 mb-2 last:mb-0">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">{tip}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
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
              <Upload className="w-5 h-5" /> Upload Photo
            </Button>
          </div>
        </div>
      )}

      {scanState === "analyzing" && config && (
        <div className="px-4 pt-12 pb-8 flex flex-col items-center">
          {selectedImage && (
            <div className="w-48 h-48 rounded-3xl overflow-hidden mb-8 shadow-xl">
              <img src={selectedImage} alt="Scan preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="relative w-32 h-32 mb-6">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} opacity-10 animate-ping`} />
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-xl`}>
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Checking your farm...</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">Gemini AI is analysing your photo</p>
          <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-600">Analysis Progress</span>
              <span className="text-xs font-bold" style={{ color: config.accentColor }}>{analysisProgress}%</span>
            </div>
            <Progress value={analysisProgress} className="h-2 bg-gray-100" />
            <div className="mt-3 space-y-1.5">
              {[
                { step: "Reading photo", threshold: 20 },
                { step: "Identifying patterns", threshold: 45 },
                { step: "Comparing with disease database", threshold: 70 },
                { step: "Building your recommendations", threshold: 92 },
              ].map(({ step, threshold }) => (
                <div key={step} className="flex items-center gap-2 text-xs">
                  {analysisProgress >= threshold ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : analysisProgress >= threshold - 25 ? (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" />
                  )}
                  <span className={analysisProgress >= threshold ? "text-gray-800 font-medium" : "text-gray-400"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {scanState === "results" && results && config && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {selectedImage && (
            <div className="relative w-full h-40 rounded-2xl overflow-hidden shadow-sm">
              <img src={selectedImage} alt="Analyzed" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                <span className="text-white text-xs font-semibold">Analysed Photo</span>
              </div>
            </div>
          )}

          <Card className={`rounded-2xl border-0 shadow-sm ${
            severityLevel === "good" ? "bg-green-50" :
            severityLevel === "warning" ? "bg-amber-50" : "bg-red-50"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  severityLevel === "good" ? "bg-green-100" :
                  severityLevel === "warning" ? "bg-amber-100" : "bg-red-100"
                }`}>
                  <SeverityIcon level={results.severity} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-black text-gray-900 text-sm leading-tight">{results.diagnosis}</h3>
                    <Badge className={`shrink-0 text-[10px] font-bold border-0 ${
                      severityLevel === "good" ? "bg-green-200 text-green-800" :
                      severityLevel === "warning" ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800"
                    }`}>
                      {results.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${severityLevel === "good" ? "bg-green-500" : severityLevel === "warning" ? "bg-amber-500" : "bg-red-500"}`}
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

          {results.additionalInfo && results.additionalInfo.length > 0 && (
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

          {results.recommendations && results.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">What To Do Now</h3>
              <div className="space-y-2">
                {results.recommendations.map((rec: string, i: number) => (
                  <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                    <CardContent className="p-3.5 flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        i === 0 ? "bg-red-50 text-red-500" :
                        i === 1 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                      }`}>
                        {i === 0 ? <FlaskConical className="w-3.5 h-3.5" /> :
                         i === 1 ? <AlertTriangle className="w-3.5 h-3.5" /> :
                         <Leaf className="w-3.5 h-3.5" />}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 leading-relaxed flex-1">{rec}</p>
                      <Badge className={`text-[9px] font-bold border-0 shrink-0 ${
                        i === 0 ? "bg-red-100 text-red-700" : i === 1 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}>
                        {i === 0 ? "urgent" : i === 1 ? "important" : "helpful"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {credits && (
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                Scans used: <span className="font-black text-gray-800">{credits.used} / {credits.limit}</span>
                {credits.remaining > 0 ? ` · ${credits.remaining} remaining` : " · Upgrade to continue"}
              </p>
            </div>
          )}

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
            <CardContent className="p-4 text-white">
              <p className="text-sm font-bold mb-1">Want more detailed advice?</p>
              <p className="text-xs text-blue-200 mb-3">Ask FarmGPT — it already knows your scan results and can give you step-by-step treatment guidance.</p>
              <Button
                onClick={() => setLocation("/farmgpt")}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm h-9 w-full rounded-xl"
              >
                Ask FarmGPT
              </Button>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full h-12 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Check Again
          </Button>
        </div>
      )}
    </div>
  );
}
