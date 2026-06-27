import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Search, RefreshCw, MapPin,
  AlertCircle, Bot, Loader2, X, Tag, AlertTriangle, ChevronDown,
  Navigation, Clock, ShoppingBag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetMarketPrices,
  useGetMarketSummary,
  getGetMarketPricesQueryKey,
  getGetMarketSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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

type MarketTab = "prices" | "nearby";
type PriceFilter = "all" | "crops" | "livestock" | "inputs";

interface FarmItem {
  name: string;
  type: "crop" | "livestock";
  stage?: string;
  count?: number;
  healthScore: number;
  pricePerKg: number;
  unit: string;
  market: string;
  trend: string;
  changePercent: number;
  advice: string;
}

interface FarmInsights {
  farmerState: string;
  items: FarmItem[];
  scanAlert: string | null;
  hasFarmData: boolean;
}

interface AnalysisResult {
  commodity: string;
  action: string;
  currentPrice: number | null;
  unit: string;
  trend: string;
  changePercent: number;
  recommendation: string;
  reasoning: string;
  riskLevel: string;
  projectedPriceIn7Days: number | null;
  projectedPriceIn30Days: number | null;
  bestTimeWindow: string;
  tip: string;
  market?: string;
}

const COMMODITIES = [
  "Maize", "Rice", "Sorghum", "Cowpea", "Groundnut",
  "Tomatoes", "Onions", "Cassava", "Yam", "Pepper",
  "Goat", "Cattle", "Poultry", "Fertilizer",
];

const COMMODITY_CATS: Record<string, PriceFilter> = {
  Maize: "crops", "Rice (local)": "crops", Rice: "crops", Sorghum: "crops",
  Tomatoes: "crops", Cowpea: "crops", Groundnut: "crops", Onions: "crops",
  Yam: "crops", "Cassava (flour)": "crops", "Pepper (dry)": "crops",
  "Goat (live)": "livestock", "Cattle (live)": "livestock", "Poultry (live)": "livestock",
  "Fertilizer (NPK)": "inputs",
};

function getRiskColor(risk: string) {
  if (risk === "low") return "text-green-600 bg-green-50";
  if (risk === "high") return "text-red-600 bg-red-50";
  return "text-amber-600 bg-amber-50";
}

export default function Market() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MarketTab>("prices");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [search, setSearch] = useState("");
  const [farmInsights, setFarmInsights] = useState<FarmInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analyzeCommodity, setAnalyzeCommodity] = useState("");
  const [analyzeAction, setAnalyzeAction] = useState<"buy" | "sell">("sell");
  const [analyzeResult, setAnalyzeResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [nearbyMarkets, setNearbyMarkets] = useState<any[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { data: prices, isLoading: pricesLoading, refetch } = useGetMarketPrices({
    query: { queryKey: getGetMarketPricesQueryKey() },
  });
  const { data: summary } = useGetMarketSummary({
    query: { queryKey: getGetMarketSummaryQueryKey() },
  });

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const data = await apiFetch("/market/farm-insights");
      setFarmInsights(data);
    } catch {
      setFarmInsights(null);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const loadNearby = useCallback(async () => {
    setLoadingNearby(true);
    try {
      const data = await apiFetch("/market/nearby");
      setNearbyMarkets(data);
    } catch {
      setNearbyMarkets([]);
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  useEffect(() => {
    if (activeTab === "nearby") loadNearby();
  }, [activeTab, loadNearby]);

  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location not supported", description: "Your browser doesn't support GPS location.", variant: "destructive" });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
        toast({ title: "Location found!", description: "Distances calculated from your current position." });
      },
      () => {
        setGettingLocation(false);
        toast({ title: "Location denied", description: "Allow location access to see distances.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAnalyze = async () => {
    if (!analyzeCommodity) { toast({ title: "Pick a commodity first" }); return; }
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const result = await apiFetch("/market/analyze", {
        method: "POST",
        body: JSON.stringify({ commodity: analyzeCommodity, action: analyzeAction }),
      });
      setAnalyzeResult(result);
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredPrices = prices?.filter((p) => {
    const matchesSearch = p.commodity.toLowerCase().includes(search.toLowerCase());
    const cat = COMMODITY_CATS[p.commodity] ?? "crops";
    const matchesFilter = priceFilter === "all" || cat === priceFilter;
    return matchesSearch && matchesFilter;
  });

  const trendIcon = (trend: string) =>
    trend === "rising" ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
    : trend === "falling" ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
    : <Minus className="w-3.5 h-3.5 text-gray-400" />;

  const trendColor = (trend: string) =>
    trend === "rising" ? "text-green-600" : trend === "falling" ? "text-red-500" : "text-gray-400";

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── HEADER ── */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-gray-900">AgriMarket</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {farmInsights?.farmerState ? `${farmInsights.farmerState}, Nigeria` : "Nigeria"} •{" "}
              <span className="text-[#16A34A] font-semibold">Live Prices</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAnalyzer(true); setAnalyzeResult(null); }}
              className="w-10 h-10 rounded-full bg-[#1E3A8A]/10 flex items-center justify-center"
            >
              <Bot className="w-5 h-5 text-[#1E3A8A]" />
            </button>
            <button
              onClick={() => { refetch(); loadInsights(); }}
              className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex border-b border-gray-100">
          {([{ id: "prices", label: "Prices & Insights" }, { id: "nearby", label: "Nearby Markets" }] as { id: MarketTab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === t.id ? "border-[#16A34A] text-[#16A34A]" : "border-transparent text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "nearby" && (
        <div className="px-4 pt-4 pb-24 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">Markets Near You</h2>
              <p className="text-xs text-gray-400">Based on your registered location</p>
            </div>
            <button onClick={loadNearby} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* GPS Distance Button */}
          <button
            onClick={getMyLocation}
            disabled={gettingLocation}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
              userLocation
                ? "bg-green-50 text-[#16A34A] border-2 border-[#16A34A]"
                : "bg-[#1E3A8A] text-white shadow-md"
            }`}
          >
            {gettingLocation ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Getting your location...</>
            ) : userLocation ? (
              <><Navigation className="w-4 h-4" /> Location Active — Distances Showing</>
            ) : (
              <><Navigation className="w-4 h-4" /> Tap to Get Distance from My Location</>
            )}
          </button>

          {loadingNearby ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
          ) : nearbyMarkets.length > 0 ? (
            <div className="space-y-3">
              {[...nearbyMarkets]
                .map((m: any) => ({
                  ...m,
                  computedKm: userLocation ? haversineKm(userLocation.lat, userLocation.lng, m.lat, m.lng) : null,
                }))
                .sort((a, b) => (a.computedKm ?? Infinity) - (b.computedKm ?? Infinity))
                .map((market: any) => {
                  // Opens Google Maps with turn-by-turn directions from current location
                  const mapsUrl = market.lat && market.lng
                    ? `https://www.google.com/maps/dir/?api=1&destination=${market.lat},${market.lng}&travelmode=driving`
                    : `https://www.google.com/maps/search/${encodeURIComponent(`${market.name}, ${market.state}, Nigeria`)}`;

                  const distLabel = market.computedKm != null
                    ? market.computedKm < 1
                      ? `${Math.round(market.computedKm * 1000)} m`
                      : `${market.computedKm.toFixed(1)} km`
                    : null;

                  return (
                    <Card key={market.id} className="rounded-2xl border-0 bg-white shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <h3 className="font-bold text-gray-900">{market.name}</h3>
                              <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full ${market.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {market.isOpen ? "OPEN" : "CLOSED"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" /> {market.specialty}
                            </p>
                          </div>
                          {distLabel && (
                            <div className="text-right shrink-0 bg-[#16A34A]/10 rounded-xl px-2.5 py-1.5">
                              <p className="text-sm font-black text-[#16A34A]">{distLabel}</p>
                              <p className="text-[9px] text-gray-400 font-semibold">from you</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <Clock className="w-3 h-3" /> {market.hours}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <MapPin className="w-3 h-3" /> {market.days}
                          </div>
                        </div>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#1E3A8A] text-white text-xs font-bold"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Get Directions (Google Maps)
                        </a>
                      </CardContent>
                    </Card>
                  );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center">
                <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-500">No nearby markets found</p>
                <p className="text-xs text-gray-400 mt-1">Update your state in Settings to see local markets.</p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-0 bg-blue-50 shadow-sm">
            <CardContent className="p-4 flex gap-3">
              <Navigation className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#1E3A8A] mb-1">How distances work</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tap the button above to use your GPS. Distance is calculated as a straight line — actual road distance may be longer. Tap "Get Directions" to open the map for turn-by-turn navigation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "prices" && (
      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* ── SCAN ALERT ── */}
        {farmInsights?.scanAlert && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700 mb-0.5">⚠ Farm Health Alert</p>
              <p className="text-xs text-red-600 leading-relaxed">{farmInsights.scanAlert}</p>
            </div>
          </div>
        )}

        {/* ── FOR YOUR FARM ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-black text-gray-900">For Your Farm Today</h2>
              <p className="text-xs text-gray-400">Prices and advice for what you grow</p>
            </div>
          </div>

          {loadingInsights ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
          ) : farmInsights && farmInsights.items.length > 0 ? (
            <div className="space-y-3">
              {farmInsights.items.map((item, idx) => {
                const isRising = item.trend === "rising";
                const isFalling = item.trend === "falling";
                return (
                  <Card key={idx} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                    <div className={`h-1 w-full ${isRising ? "bg-green-400" : isFalling ? "bg-red-400" : "bg-gray-200"}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-black text-gray-900">{item.name}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              item.type === "crop" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {item.type === "crop" ? (item.stage ?? "growing").toUpperCase() : `${item.count} head`}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400">{item.market}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-gray-900">₦{item.pricePerKg.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">per {item.unit}</p>
                          <div className={`flex items-center justify-end gap-0.5 mt-0.5 text-[10px] font-bold ${trendColor(item.trend)}`}>
                            {trendIcon(item.trend)}
                            <span>{isRising ? "+" : ""}{item.changePercent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className={`rounded-xl px-3 py-2 flex items-start gap-2 ${
                        isRising ? "bg-green-50" : isFalling ? "bg-red-50" : "bg-gray-50"
                      }`}>
                        <Bot className={`w-4 h-4 shrink-0 mt-0.5 ${isRising ? "text-green-600" : isFalling ? "text-red-500" : "text-gray-400"}`} />
                        <p className={`text-xs font-semibold leading-tight ${
                          isRising ? "text-green-700" : isFalling ? "text-red-700" : "text-gray-600"
                        }`}>
                          {item.advice}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-600 mb-1">No farm data yet</p>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[220px] mx-auto">
                  Add crops or livestock to your farm to get personalised price alerts and AI advice here.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ── PRICE ALERTS ── */}
        {summary?.priceAlerts && summary.priceAlerts.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-2">Price Alerts</h2>
            <div className="space-y-2">
              {summary.priceAlerts.map((alert: string, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-medium text-gray-700 leading-tight">{alert}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ALL COMMODITY PRICES ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-gray-900">All Prices</h2>
            <span className="text-[10px] text-gray-400 font-medium">Updated today</span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search commodities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-100 rounded-xl h-10 text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
            {(["all", "crops", "livestock", "inputs"] as PriceFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPriceFilter(f)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors capitalize ${
                  priceFilter === f ? "bg-[#16A34A] text-white" : "bg-white text-gray-500 border border-gray-100"
                }`}
              >
                {f === "all" ? "All" : f === "inputs" ? "Farm Inputs" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {pricesLoading ? (
            <div className="space-y-1">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : filteredPrices && filteredPrices.length > 0 ? (
            <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr,auto] gap-0 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Commodity</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Price / Trend</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filteredPrices.map((price) => (
                  <div key={price.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{price.commodity}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{price.market} • per {price.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">₦{price.pricePerKg?.toLocaleString()}</p>
                      <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold mt-0.5 ${trendColor(price.trend ?? "")}`}>
                        {trendIcon(price.trend ?? "")}
                        <span>
                          {price.changePercent != null
                            ? `${(price.changePercent ?? 0) > 0 ? "+" : ""}${price.changePercent}%`
                            : "Stable"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">No prices found.</CardContent>
            </Card>
          )}
        </section>

        {/* ── AI ADVISOR BANNER ── */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Bot className="w-8 h-8 text-blue-200 shrink-0" />
              <div className="flex-1">
                <h3 className="text-white font-black text-sm mb-1">AI Trade Advisor</h3>
                <p className="text-blue-200 text-xs leading-relaxed mb-3">
                  Get AI-powered buy/sell recommendations based on live prices, trends, and seasonal data.
                </p>
                <Button
                  size="sm"
                  onClick={() => { setShowAnalyzer(true); setAnalyzeResult(null); }}
                  className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-xs h-8 rounded-xl px-4"
                >
                  Analyze Before Trading
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
      )}

      {/* ── AI TRADE ANALYZER PANEL ── */}
      {showAnalyzer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowAnalyzer(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto max-w-[480px] mx-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#1E3A8A]" />
                <h2 className="text-base font-black text-gray-900">AI Trade Advisor</h2>
              </div>
              <button onClick={() => setShowAnalyzer(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-4 space-y-4">
              {!analyzeResult ? (
                <>
                  <p className="text-xs text-gray-500">Get AI guidance before you buy or sell any commodity.</p>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">What commodity?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {COMMODITIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => setAnalyzeCommodity(c)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                            analyzeCommodity === c
                              ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                              : "bg-white text-gray-600 border-gray-200"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">What do you want to do?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setAnalyzeAction("sell")}
                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors flex items-center justify-center gap-2 ${
                          analyzeAction === "sell" ? "bg-green-50 border-[#16A34A] text-[#16A34A]" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        <Tag className="w-4 h-4" /> Sell
                      </button>
                      <button
                        onClick={() => setAnalyzeAction("buy")}
                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors flex items-center justify-center gap-2 ${
                          analyzeAction === "buy" ? "bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        <Tag className="w-4 h-4" /> Buy
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing || !analyzeCommodity}
                    className="w-full h-12 rounded-2xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-black"
                  >
                    {analyzing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analysing...</> : "Get AI Advice"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#1E3A8A]/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-gray-900">{analyzeResult.commodity}</p>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getRiskColor(analyzeResult.riskLevel)}`}>
                        {analyzeResult.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>
                    <p className="text-2xl font-black text-[#1E3A8A] mb-0.5">
                      {analyzeResult.recommendation.toUpperCase()}
                    </p>
                    {analyzeResult.currentPrice && (
                      <p className="text-xs text-gray-500">
                        Current: ₦{analyzeResult.currentPrice.toLocaleString()} / {analyzeResult.unit}
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">Why?</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{analyzeResult.reasoning}</p>
                  </div>

                  {(analyzeResult.projectedPriceIn7Days || analyzeResult.projectedPriceIn30Days) && (
                    <div className="grid grid-cols-2 gap-3">
                      {analyzeResult.projectedPriceIn7Days && (
                        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                          <p className="text-[10px] text-gray-400 font-bold mb-0.5">IN 7 DAYS</p>
                          <p className="text-base font-black text-gray-900">₦{analyzeResult.projectedPriceIn7Days.toLocaleString()}</p>
                        </div>
                      )}
                      {analyzeResult.projectedPriceIn30Days && (
                        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                          <p className="text-[10px] text-gray-400 font-bold mb-0.5">IN 30 DAYS</p>
                          <p className="text-base font-black text-gray-900">₦{analyzeResult.projectedPriceIn30Days.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-[#1E3A8A] mb-1">💡 Expert Tip</p>
                    <p className="text-sm text-blue-800 leading-relaxed">{analyzeResult.tip}</p>
                  </div>

                  <div className="bg-amber-50 rounded-2xl p-3">
                    <p className="text-xs font-bold text-amber-700 mb-0.5">Best Time to {analyzeResult.action === "sell" ? "Sell" : "Buy"}</p>
                    <p className="text-xs text-amber-800">{analyzeResult.bestTimeWindow}</p>
                  </div>

                  <Button
                    onClick={() => { setAnalyzeResult(null); setAnalyzeCommodity(""); }}
                    variant="outline"
                    className="w-full h-11 rounded-2xl border-2 font-bold text-gray-600"
                  >
                    Analyse Another
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
