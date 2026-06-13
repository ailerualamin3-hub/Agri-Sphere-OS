import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Camera, Upload, Sprout, Activity, Zap,
  CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Loader2, ChevronRight, FlaskConical, Leaf, Clock,
  ScanLine, ArrowLeft, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetScanHistory,
  getGetScanHistoryQueryKey,
} from "@workspace/api-client-react";

type ScanType = "crop" | "animal" | "soil" | null;
type ScanState = "select" | "capture" | "analyzing" | "results";
type ActiveTab = "scan" | "history";

const SCAN_CONFIGS = {
  crop: {
    label: "Crop Diagnosis",
    description: "Diagnose plant diseases, nutrient deficiencies, and pest damage",
    icon: Sprout,
    color: "text-[#16A34A]",
    bg: "bg-green-50",
    gradient: "from-green-600 to-green-500",
    accentColor: "#16A34A",
    tips: ["Take photo in good lighting", "Focus on affected leaf or stem", "Include both healthy and affected parts"],
  },
  animal: {
    label: "Animal Diagnosis",
    description: "Detect livestock diseases, assess body condition, and identify symptoms",
    icon: Activity,
    color: "text-[#1E3A8A]",
    bg: "bg-blue-50",
    gradient: "from-blue-800 to-blue-700",
    accentColor: "#1E3A8A",
    tips: ["Photograph the full animal body", "Capture any visible symptoms", "Ensure animal is standing still"],
  },
  soil: {
    label: "Soil Analysis",
    description: "Identify soil type, check health indicators, and get crop recommendations",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    gradient: "from-amber-600 to-amber-500",
    accentColor: "#d97706",
    tips: ["Use fresh soil sample", "Photograph in natural light", "Include soil texture in frame"],
  },
};

const DEMO_RESULTS: Record<string, any> = {
  crop: {
    diagnosis: "Northern Leaf Blight",
    confidence: 87,
    severity: "Moderate",
    severityLevel: "warning",
    description: "Northern Leaf Blight (Helminthosporium turcicum) detected on maize leaves. This fungal disease causes elongated tan lesions and can reduce yield by 30–50% if untreated.",
    recommendations: [
      { action: "Apply Mancozeb fungicide at 2.5 kg/ha", urgency: "urgent", icon: FlaskConical },
      { action: "Remove and destroy severely infected leaves", urgency: "high", icon: Leaf },
      { action: "Improve air circulation by reducing plant density", urgency: "medium", icon: Sprout },
      { action: "Avoid overhead irrigation to reduce humidity", urgency: "medium", icon: Activity },
    ],
    additionalInfo: [
      { label: "Affected Area", value: "~35% of canopy" },
      { label: "Disease Stage", value: "Early-Medium" },
      { label: "Spread Risk", value: "High (rainy season)" },
      { label: "Recovery Chance", value: "Good with treatment" },
    ],
  },
  animal: {
    diagnosis: "Suspected CCPP (Contagious Caprine Pleuropneumonia)",
    confidence: 79,
    severity: "High",
    severityLevel: "critical",
    description: "Signs consistent with respiratory distress and early-stage CCPP. Immediate veterinary consultation is strongly advised. This bacterial disease spreads rapidly in herds.",
    recommendations: [
      { action: "Isolate affected animals immediately", urgency: "urgent", icon: AlertTriangle },
      { action: "Contact a licensed veterinarian within 24 hours", urgency: "urgent", icon: Activity },
      { action: "Administer Oxytetracycline 20 mg/kg as interim measure", urgency: "high", icon: FlaskConical },
      { action: "Vaccinate remaining herd as prevention", urgency: "medium", icon: CheckCircle },
    ],
    additionalInfo: [
      { label: "Symptoms Detected", value: "Respiratory distress, nasal discharge" },
      { label: "Contagion Risk", value: "Very High" },
      { label: "Treatment Window", value: "24–48 hours" },
      { label: "Mortality Risk", value: "High if untreated" },
    ],
  },
  soil: {
    diagnosis: "Sandy Loam — Moderate Fertility",
    confidence: 93,
    severity: "Good",
    severityLevel: "good",
    description: "Sandy loam soil with moderate organic matter. Good drainage but may need nutrient supplementation. pH appears slightly acidic, limiting nutrient availability.",
    recommendations: [
      { action: "Apply organic compost at 5 tonnes/hectare", urgency: "high", icon: Leaf },
      { action: "Add lime to raise pH to 6.0–6.5", urgency: "high", icon: FlaskConical },
      { action: "Plant cowpea as cover crop to fix nitrogen", urgency: "medium", icon: Sprout },
      { action: "Use drip irrigation to reduce leaching", urgency: "medium", icon: Activity },
    ],
    additionalInfo: [
      { label: "Soil Type", value: "Sandy Loam" },
      { label: "Estimated pH", value: "5.8–6.2 (slightly acidic)" },
      { label: "Drainage", value: "Good" },
      { label: "Best Crops", value: "Maize, Cowpea, Groundnut, Sorghum" },
    ],
  },
};

function SeverityIcon({ level }: { level: string }) {
  if (level === "good") return <CheckCircle className="w-6 h-6 text-green-600" />;
  if (level === "warning") return <AlertTriangle className="w-6 h-6 text-amber-600" />;
  return <XCircle className="w-6 h-6 text-red-500" />;
}

export default function Diagnose() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("scan");
  const [scanType, setScanType] = useState<ScanType>(null);
  const [scanState, setScanState] = useState<ScanState>("select");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: history, isLoading: historyLoading } = useGetScanHistory({
    query: { queryKey: getGetScanHistoryQueryKey(), enabled: activeTab === "history" },
  });

  const handleScanTypeSelect = (type: ScanType) => {
    setScanType(type);
    setScanState("capture");
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      startAnalysis();
    };
    reader.readAsDataURL(file);
  }, []);

  const startAnalysis = useCallback(() => {
    setScanState("analyzing");
    setAnalysisProgress(0);
    const steps = [10, 25, 45, 62, 78, 88, 95, 100];
    steps.forEach((step, i) => {
      setTimeout(() => {
        setAnalysisProgress(step);
        if (step === 100) setTimeout(() => setScanState("results"), 400);
      }, i * 350);
    });
  }, []);

  const handleReset = () => {
    setScanType(null);
    setScanState("select");
    setSelectedImage(null);
    setAnalysisProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const results = scanType ? DEMO_RESULTS[scanType] : null;
  const config = scanType ? SCAN_CONFIGS[scanType] : null;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          {scanState !== "select" ? (
            <button onClick={handleReset} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          ) : null}
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {scanState === "select" ? "Diagnose" : config?.label}
            </h1>
            <p className="text-xs text-gray-500">
              {scanState === "select" ? "AI-powered agricultural diagnostics" : config?.description}
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
                {t === "scan" ? "New Scan" : "History"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scan Tab — Type Selection */}
      {activeTab === "scan" && scanState === "select" && (
        <div className="px-4 pt-6 pb-8">
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
              <h3 className="font-bold text-sm mb-1">How Diagnosis Works</h3>
              <p className="text-xs text-blue-200 leading-relaxed mb-3">
                Our AI analyzes photos of crops, animals, or soil and delivers a clinical diagnosis with treatment recommendations in seconds.
              </p>
              <div className="space-y-2">
                {["Upload or take a photo", "AI analyzes in seconds", "Get diagnosis & treatment plan"].map((step, i) => (
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

      {/* History Tab */}
      {activeTab === "history" && scanState === "select" && (
        <div className="px-4 pt-6 pb-8">
          {historyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((scan) => {
                const isGood = scan.severity === "Good" || scan.confidence >= 90;
                const isHigh = scan.severity === "High" || scan.severity === "Critical";
                return (
                  <Card key={scan.id} className="rounded-2xl border-0 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isGood ? "bg-green-50" : isHigh ? "bg-red-50" : "bg-amber-50"
                        }`}>
                          {isGood ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                           isHigh ? <XCircle className="w-5 h-5 text-red-500" /> :
                           <AlertTriangle className="w-5 h-5 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{scan.diagnosis}</p>
                            <Badge className={`shrink-0 text-[10px] font-bold border-0 capitalize ${
                              isGood ? "bg-green-100 text-green-700" : isHigh ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {scan.severity}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-gray-400 font-semibold mt-1 capitalize">{scan.scanType} scan • {scan.confidence}% confidence</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(scan.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
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
              <p className="text-sm font-bold text-gray-500 mb-1">No scan history yet</p>
              <p className="text-xs text-gray-400 max-w-[200px]">Complete your first diagnosis scan to see your history here.</p>
              <Button
                onClick={() => setActiveTab("scan")}
                className="mt-4 bg-[#16A34A] text-white rounded-xl font-bold text-sm"
              >
                Start First Scan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Capture Screen */}
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
            <p className="text-white font-bold text-lg mb-1">Ready to Scan</p>
            <p className="text-white/70 text-xs text-center px-8">Position your {scanType === "crop" ? "plant/leaf" : scanType === "animal" ? "livestock" : "soil sample"} in the frame</p>
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
              <Upload className="w-5 h-5" /> Upload Image
            </Button>
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => { setSelectedImage("demo"); startAnalysis(); }}
              className="text-xs text-gray-400 underline"
            >
              Run demo analysis (no image)
            </button>
          </div>
        </div>
      )}

      {/* Analyzing Screen */}
      {scanState === "analyzing" && config && (
        <div className="px-4 pt-12 pb-8 flex flex-col items-center">
          {selectedImage && selectedImage !== "demo" && (
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
          <h2 className="text-xl font-bold text-gray-900 mb-1">Analyzing...</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">AI processing your {config.label.toLowerCase()}</p>
          <div className="w-full bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-600">Analysis Progress</span>
              <span className="text-xs font-bold" style={{ color: config.accentColor }}>{analysisProgress}%</span>
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
                  <span className={analysisProgress >= threshold ? "text-gray-800 font-medium" : "text-gray-400"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Screen */}
      {scanState === "results" && results && config && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {selectedImage && selectedImage !== "demo" && (
            <div className="relative w-full h-40 rounded-2xl overflow-hidden shadow-sm">
              <img src={selectedImage} alt="Analyzed" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                <span className="text-white text-xs font-semibold">Analyzed Image</span>
              </div>
            </div>
          )}

          <Card className={`rounded-2xl border-0 shadow-sm ${
            results.severityLevel === "good" ? "bg-green-50" :
            results.severityLevel === "warning" ? "bg-amber-50" : "bg-red-50"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  results.severityLevel === "good" ? "bg-green-100" :
                  results.severityLevel === "warning" ? "bg-amber-100" : "bg-red-100"
                }`}>
                  <SeverityIcon level={results.severityLevel} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-black text-gray-900 text-sm leading-tight">{results.diagnosis}</h3>
                    <Badge className={`shrink-0 text-[10px] font-bold border-0 ${
                      results.severityLevel === "good" ? "bg-green-200 text-green-800" :
                      results.severityLevel === "warning" ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800"
                    }`}>
                      {results.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${results.severityLevel === "good" ? "bg-green-500" : results.severityLevel === "warning" ? "bg-amber-500" : "bg-red-500"}`}
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

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Recommended Actions</h3>
            <div className="space-y-2">
              {results.recommendations.map((rec: any, i: number) => {
                const Icon = rec.icon;
                return (
                  <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                    <CardContent className="p-3.5 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        rec.urgency === "urgent" ? "bg-red-50 text-red-500" :
                        rec.urgency === "high" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="flex-1 text-xs font-semibold text-gray-900 leading-tight">{rec.action}</p>
                      <Badge className={`text-[9px] font-bold border-0 shrink-0 ${
                        rec.urgency === "urgent" ? "bg-red-100 text-red-700" :
                        rec.urgency === "high" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}>
                        {rec.urgency}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
            <CardContent className="p-4 text-white">
              <p className="text-sm font-bold mb-1">Need more guidance?</p>
              <p className="text-xs text-blue-200 mb-3">Ask FREGE AI for detailed treatment advice based on your specific situation.</p>
              <Button
                onClick={() => setLocation("/farmgpt")}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm h-9 w-full rounded-xl"
              >
                Ask FREGE AI
              </Button>
            </CardContent>
          </Card>

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
