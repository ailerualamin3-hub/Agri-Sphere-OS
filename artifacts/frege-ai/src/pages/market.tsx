import React, { useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Search, RefreshCw, MapPin,
  BarChart2, AlertCircle, ChevronRight, Lightbulb, Plus, X,
  ShoppingBag, Tag, CheckCircle, Clock, ShieldCheck, Loader2,
  Bot, ArrowUpRight, ArrowDownRight, AlertTriangle, Wheat
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type Tab = "prices" | "marketplace" | "nearby";
type ListingType = "all" | "sell" | "buy";

interface Listing {
  id: number; farmerId: number; farmerName: string; farmerVerified: boolean;
  type: string; title: string; description: string; priceNgn: number;
  quantity: number; unit: string; state: string; lga: string; createdAt: string;
}

interface NearbyMarket {
  id: number; name: string; specialty: string; days: string; hours: string;
  distance: string; isOpen: boolean; state: string;
}

interface AnalysisResult {
  commodity: string; action: string; currentPrice: number | null; unit: string;
  trend: string; changePercent: number; recommendation: string; reasoning: string;
  riskLevel: string; projectedPriceIn7Days: number | null; projectedPriceIn30Days: number | null;
  bestTimeWindow: string; tip: string; market?: string;
}

const UNITS = ["kg", "bag (50kg)", "tonne", "crate", "head", "bunch", "litre"];
const COMMODITIES = ["Maize", "Rice", "Sorghum", "Cowpea", "Groundnut", "Tomatoes", "Onions", "Cassava", "Yam", "Pepper", "Goat", "Cattle", "Poultry", "Fertilizer", "Other"];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getRiskColor(risk: string) {
  if (risk === "low") return "text-green-600 bg-green-50 border-green-200";
  if (risk === "high") return "text-red-600 bg-red-50 border-red-200";
  return "text-amber-600 bg-amber-50 border-amber-200";
}

function getRecommendationColor(rec: string) {
  if (rec.includes("now") || rec.includes("buy now") || rec.includes("sell now")) return "bg-green-600";
  if (rec.includes("urgent")) return "bg-red-600";
  if (rec.includes("wait")) return "bg-amber-500";
  return "bg-blue-600";
}

export default function Market() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("prices");
  const [priceFilter, setPriceFilter] = useState<"all" | "crops" | "livestock" | "inputs">("all");
  const [listingFilter, setListingFilter] = useState<ListingType>("all");
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [nearbyMarkets, setNearbyMarkets] = useState<NearbyMarket[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analyzeCommodity, setAnalyzeCommodity] = useState("");
  const [analyzeAction, setAnalyzeAction] = useState<"buy" | "sell">("sell");
  const [analyzeResult, setAnalyzeResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [postForm, setPostForm] = useState({ type: "sell", title: "", commodity: "", description: "", priceNgn: "", quantity: "", unit: "kg" });
  const [posting, setPosting] = useState(false);

  const { data: prices, isLoading: pricesLoading, refetch } = useGetMarketPrices({ query: { queryKey: getGetMarketPricesQueryKey() } });
  const { data: summary } = useGetMarketSummary({ query: { queryKey: getGetMarketSummaryQueryKey() } });

  const COMMODITY_CATS: Record<string, string> = {
    Maize: "crops", "Rice (local)": "crops", "Rice": "crops", Sorghum: "crops", Tomatoes: "crops",
    Cowpea: "crops", Groundnut: "crops", Onions: "crops", Yam: "crops", "Cassava (flour)": "crops",
    "Pepper (dry)": "crops", "Goat (live)": "livestock", "Cattle (live)": "livestock", "Poultry (live)": "livestock",
    "Fertilizer (NPK)": "inputs",
  };

  const filteredPrices = prices?.filter((p) => {
    const matchesSearch = p.commodity.toLowerCase().includes(search.toLowerCase());
    const cat = COMMODITY_CATS[p.commodity] ?? "crops";
    const matchesFilter = priceFilter === "all" || cat === priceFilter;
    return matchesSearch && matchesFilter;
  });

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const data = await apiFetch("/market/listings");
      setListings(data);
    } catch {
      toast({ title: "Could not load listings", variant: "destructive" });
    } finally {
      setLoadingListings(false);
    }
  }, [toast]);

  const loadNearby = useCallback(async () => {
    setLoadingNearby(true);
    try {
      const data = await apiFetch("/market/nearby");
      setNearbyMarkets(data);
    } catch {
      toast({ title: "Could not load nearby markets", variant: "destructive" });
    } finally {
      setLoadingNearby(false);
    }
  }, [toast]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "marketplace" && listings.length === 0) loadListings();
    if (t === "nearby" && nearbyMarkets.length === 0) loadNearby();
  };

  const handleAnalyze = async () => {
    if (!analyzeCommodity) { toast({ title: "Pick a commodity first" }); return; }
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const result = await apiFetch("/market/analyze", { method: "POST", body: JSON.stringify({ commodity: analyzeCommodity, action: analyzeAction }) });
      setAnalyzeResult(result);
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePostListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title || !postForm.priceNgn || !postForm.quantity) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    setPosting(true);
    try {
      const newListing = await apiFetch("/market/listings", {
        method: "POST",
        body: JSON.stringify({
          type: postForm.type,
          title: `${postForm.commodity || postForm.title}`,
          description: postForm.description || `${postForm.type === "sell" ? "Selling" : "Buying"} ${postForm.quantity}${postForm.unit} of ${postForm.commodity || postForm.title}`,
          priceNgn: parseFloat(postForm.priceNgn),
          quantity: parseFloat(postForm.quantity),
          unit: postForm.unit,
        }),
      });
      setListings((prev) => [newListing, ...prev]);
      setShowPostModal(false);
      setPostForm({ type: "sell", title: "", commodity: "", description: "", priceNgn: "", quantity: "", unit: "kg" });
      toast({ title: "Listing posted!", description: "Your listing is now live in the marketplace." });
    } catch (err: unknown) {
      toast({ title: "Failed to post listing", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const filteredListings = listings.filter((l) => listingFilter === "all" || l.type === listingFilter);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AgriMarket</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Nigeria •
              <span className="text-[#16A34A] font-semibold">Live Prices</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowAnalyzer(true); setAnalyzeResult(null); }} className="w-9 h-9 rounded-full bg-[#1E3A8A]/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#1E3A8A]" />
            </button>
            <button onClick={() => refetch()} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["prices", "marketplace", "nearby"] as Tab[]).map((t) => (
            <button key={t} onClick={() => handleTabChange(t)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors capitalize ${tab === t ? "bg-white text-[#1E3A8A] shadow-sm" : "text-gray-500"}`}>
              {t === "marketplace" ? "Listings" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ===== PRICES TAB ===== */}
      {tab === "prices" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search commodities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white border-gray-100 rounded-xl h-10 text-sm" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(["all", "crops", "livestock", "inputs"] as const).map((f) => (
              <button key={f} onClick={() => setPriceFilter(f)} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors capitalize ${priceFilter === f ? "bg-[#16A34A] text-white" : "bg-white text-gray-500 border border-gray-100"}`}>{f}</button>
            ))}
          </div>

          {summary?.priceAlerts && summary.priceAlerts.length > 0 && (
            <div className="space-y-2">
              {summary.priceAlerts.map((alert: string, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-amber-50 rounded-xl px-3.5 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-medium text-gray-700 leading-tight">{alert}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Live Prices</h2>
            <span className="text-[10px] text-gray-400 font-medium">Updated today</span>
          </div>

          {pricesLoading ? (
            <div className="space-y-1">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : filteredPrices && filteredPrices.length > 0 ? (
            <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr,auto] gap-0 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Commodity</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Price / Change</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filteredPrices.map((price) => {
                  const isRising = price.trend === "rising";
                  const isFalling = price.trend === "falling";
                  return (
                    <div key={price.id} className="flex items-center justify-between px-4 py-3.5">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{price.commodity}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{price.market} • per {price.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">₦{price.pricePerKg?.toLocaleString()}</p>
                        <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold mt-0.5 ${isRising ? "text-green-600" : isFalling ? "text-red-500" : "text-gray-400"}`}>
                          {isRising ? <TrendingUp className="w-3 h-3" /> : isFalling ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          <span>{price.changePercent != null ? `${isRising ? "+" : ""}${price.changePercent}%` : "Stable"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm"><CardContent className="p-8 text-center text-sm text-gray-400">No prices found.</CardContent></Card>
          )}

          {/* AI Trade Advisor Banner */}
          <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Bot className="w-8 h-8 text-blue-200 shrink-0" />
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">AI Trade Advisor</h3>
                  <p className="text-blue-200 text-xs leading-relaxed mb-3">Get AI-powered buy/sell recommendations based on live prices, trends, and seasonal data before you trade.</p>
                  <Button size="sm" onClick={() => { setShowAnalyzer(true); setAnalyzeResult(null); }} className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-xs h-8 rounded-xl px-4">
                    Analyze Before Trading
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== MARKETPLACE TAB ===== */}
      {tab === "marketplace" && (
        <div className="px-4 pt-4 pb-24 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["all", "sell", "buy"] as ListingType[]).map((f) => (
                <button key={f} onClick={() => setListingFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors capitalize ${listingFilter === f ? "bg-[#16A34A] text-white" : "bg-white text-gray-500 border border-gray-100"}`}>
                  {f === "sell" ? "For Sale" : f === "buy" ? "Wanted" : "All"}
                </button>
              ))}
            </div>
            <button onClick={() => setShowPostModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] text-white rounded-xl text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> Post
            </button>
          </div>

          {loadingListings ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <ShoppingBag className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">No listings yet</p>
              <p className="text-xs text-center">Be the first to post a listing for other farmers to see</p>
              <Button size="sm" onClick={() => setShowPostModal(true)} className="bg-[#16A34A] text-white rounded-xl mt-1">
                <Plus className="w-3.5 h-3.5 mr-1" /> Post Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.type === "sell" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {listing.type === "sell" ? "FOR SALE" : "WANTED"}
                          </span>
                          {listing.farmerVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 truncate">{listing.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{listing.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-[#16A34A]">₦{listing.priceNgn?.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">per {listing.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><Wheat className="w-3 h-3" />{listing.quantity} {listing.unit}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.lga || listing.state}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(listing.createdAt)}</span>
                      </div>
                      <button className="text-[11px] font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-1.5 rounded-lg">
                        Contact
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== NEARBY TAB ===== */}
      {tab === "nearby" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Markets Near You</h2>
            <button onClick={loadNearby} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {loadingNearby ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
          ) : nearbyMarkets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <MapPin className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">Loading markets...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl px-3.5 py-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E3A8A] shrink-0" />
                <p className="text-xs text-[#1E3A8A] font-medium">Markets are shown based on your registered state/location.</p>
              </div>
              <div className="space-y-3">
                {nearbyMarkets.map((mkt) => (
                  <Card key={mkt.id} className="rounded-2xl border-0 bg-white shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mkt.isOpen ? "bg-green-50" : "bg-gray-50"}`}>
                        <MapPin className={`w-5 h-5 ${mkt.isOpen ? "text-[#16A34A]" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{mkt.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{mkt.specialty}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{mkt.days} • {mkt.hours}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-gray-600">{mkt.distance}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mkt.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {mkt.isOpen ? "Open" : "Closed"}
                        </span>
                        <button className="text-[10px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-1 rounded-lg">Directions</button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== AI TRADE ANALYZER PANEL ===== */}
      {showAnalyzer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowAnalyzer(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto max-w-[480px] mx-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#1E3A8A]" />
                <h2 className="text-base font-bold text-gray-900">AI Trade Advisor</h2>
              </div>
              <button onClick={() => setShowAnalyzer(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-4 space-y-4">
              {!analyzeResult ? (
                <>
                  <p className="text-xs text-gray-500">Get AI-driven guidance before buying or selling any commodity.</p>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">What commodity?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {COMMODITIES.map((c) => (
                        <button key={c} onClick={() => setAnalyzeCommodity(c)} className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${analyzeCommodity === c ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "bg-white text-gray-600 border-gray-200"}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">What do you want to do?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setAnalyzeAction("sell")} className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors flex items-center justify-center gap-2 ${analyzeAction === "sell" ? "bg-green-50 border-[#16A34A] text-[#16A34A]" : "border-gray-200 text-gray-500"}`}>
                        <Tag className="w-4 h-4" /> Sell
                      </button>
                      <button onClick={() => setAnalyzeAction("buy")} className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors flex items-center justify-center gap-2 ${analyzeAction === "buy" ? "bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]" : "border-gray-200 text-gray-500"}`}>
                        <ShoppingBag className="w-4 h-4" /> Buy
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleAnalyze} disabled={analyzing || !analyzeCommodity} className="w-full bg-[#1E3A8A] text-white rounded-xl h-12 font-bold">
                    {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : "Analyze Now"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-gray-900">{analyzeResult.commodity}</h3>
                      <p className="text-xs text-gray-500">{analyzeResult.action === "sell" ? "Selling analysis" : "Buying analysis"} • {analyzeResult.market ?? "National"}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${getRiskColor(analyzeResult.riskLevel)}`}>
                      {analyzeResult.riskLevel} risk
                    </span>
                  </div>

                  <div className={`rounded-2xl p-4 text-white ${getRecommendationColor(analyzeResult.recommendation)}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">AI Recommendation</p>
                    <p className="text-lg font-black capitalize">{analyzeResult.recommendation}</p>
                    <p className="text-[11px] mt-1 opacity-90">{analyzeResult.bestTimeWindow}</p>
                  </div>

                  {analyzeResult.currentPrice && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 font-medium mb-1">Now</p>
                        <p className="text-sm font-black text-gray-900">₦{analyzeResult.currentPrice.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400">/{analyzeResult.unit}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 font-medium mb-1">7 days</p>
                        <p className={`text-sm font-black ${(analyzeResult.projectedPriceIn7Days ?? 0) > (analyzeResult.currentPrice ?? 0) ? "text-green-600" : "text-red-500"}`}>
                          ₦{analyzeResult.projectedPriceIn7Days?.toLocaleString() ?? "—"}
                        </p>
                        <div className="flex justify-center mt-0.5">
                          {(analyzeResult.projectedPriceIn7Days ?? 0) > (analyzeResult.currentPrice ?? 0)
                            ? <ArrowUpRight className="w-3 h-3 text-green-500" />
                            : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-400 font-medium mb-1">30 days</p>
                        <p className={`text-sm font-black ${(analyzeResult.projectedPriceIn30Days ?? 0) > (analyzeResult.currentPrice ?? 0) ? "text-green-600" : "text-red-500"}`}>
                          ₦{analyzeResult.projectedPriceIn30Days?.toLocaleString() ?? "—"}
                        </p>
                        <div className="flex justify-center mt-0.5">
                          {(analyzeResult.projectedPriceIn30Days ?? 0) > (analyzeResult.currentPrice ?? 0)
                            ? <ArrowUpRight className="w-3 h-3 text-green-500" />
                            : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Analysis</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{analyzeResult.reasoning}</p>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-3.5 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-0.5">Pro Tip</p>
                      <p className="text-xs text-amber-700 leading-relaxed">{analyzeResult.tip}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setAnalyzeResult(null); setAnalyzeCommodity(""); }}>
                      Analyze Another
                    </Button>
                    <Button className="flex-1 rounded-xl bg-[#16A34A]" onClick={() => { setShowAnalyzer(false); setTab("marketplace"); handleTabChange("marketplace"); }}>
                      Go to Listings
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== POST LISTING MODAL ===== */}
      {showPostModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowPostModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto max-w-[480px] mx-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <h2 className="text-base font-bold text-gray-900">Post a Listing</h2>
              <button onClick={() => setShowPostModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handlePostListing} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">I want to</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPostForm((f) => ({ ...f, type: "sell" }))} className={`py-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 ${postForm.type === "sell" ? "bg-green-50 border-[#16A34A] text-[#16A34A]" : "border-gray-200 text-gray-500"}`}>
                    <Tag className="w-4 h-4" /> Sell
                  </button>
                  <button type="button" onClick={() => setPostForm((f) => ({ ...f, type: "buy" }))} className={`py-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 ${postForm.type === "buy" ? "bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]" : "border-gray-200 text-gray-500"}`}>
                    <ShoppingBag className="w-4 h-4" /> Buy
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Commodity *</label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMODITIES.slice(0, 12).map((c) => (
                    <button type="button" key={c} onClick={() => setPostForm((f) => ({ ...f, commodity: c, title: c }))} className={`py-2 rounded-xl text-xs font-medium border transition-colors ${postForm.commodity === c ? "bg-[#16A34A] text-white border-[#16A34A]" : "bg-white text-gray-600 border-gray-200"}`}>{c}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Price (₦) *</label>
                  <Input type="number" placeholder="e.g. 450" value={postForm.priceNgn} onChange={(e) => setPostForm((f) => ({ ...f, priceNgn: e.target.value }))} className="rounded-xl border-gray-200 h-10" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Unit</label>
                  <select value={postForm.unit} onChange={(e) => setPostForm((f) => ({ ...f, unit: e.target.value }))} className="w-full h-10 rounded-xl border border-gray-200 bg-white text-sm px-3 text-gray-700">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Quantity *</label>
                <Input type="number" placeholder="e.g. 500" value={postForm.quantity} onChange={(e) => setPostForm((f) => ({ ...f, quantity: e.target.value }))} className="rounded-xl border-gray-200 h-10" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Description (optional)</label>
                <textarea value={postForm.description} onChange={(e) => setPostForm((f) => ({ ...f, description: e.target.value }))} placeholder="Any extra details about quality, delivery, etc." className="w-full rounded-xl border border-gray-200 bg-white text-sm px-3 py-2.5 h-20 resize-none text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A]" />
              </div>

              <Button type="submit" disabled={posting} className="w-full bg-[#16A34A] text-white rounded-xl h-12 font-bold">
                {posting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</> : "Post Listing"}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
