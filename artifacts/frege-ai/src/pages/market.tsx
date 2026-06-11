import React, { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus, Search, RefreshCw,
  MapPin, BarChart2, AlertCircle, ChevronRight, Lightbulb
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

type Filter = "all" | "crops" | "livestock" | "inputs";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  crops: "Crops",
  livestock: "Livestock",
  inputs: "Inputs",
};

const COMMODITY_CATEGORIES: Record<string, Filter> = {
  Maize: "crops", Rice: "crops", Sorghum: "crops", Tomatoes: "crops",
  Cowpea: "crops", Groundnut: "crops", Onions: "crops",
  "Goat (live)": "livestock", "Cattle (live)": "livestock", "Poultry (live)": "livestock",
};

const weeklyInsights = [
  { icon: TrendingUp, text: "Rice prices surged 8.3% — sell before market correction", color: "text-green-600", bg: "bg-green-50" },
  { icon: TrendingDown, text: "Tomato prices falling fast — offload surplus stock now", color: "text-red-500", bg: "bg-red-50" },
  { icon: AlertCircle, text: "Maize demand rising from processors — good selling window", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Lightbulb, text: "Cowpea season ending — lock in prices early for next season", color: "text-blue-600", bg: "bg-blue-50" },
];

const nearbyMarkets = [
  { name: "Dawanau Grain Market", distance: "4.2 km", specialty: "Grains & Pulses", active: true },
  { name: "Rimi Cattle Market", distance: "6.8 km", specialty: "Livestock", active: true },
  { name: "Yankaba Produce Market", distance: "2.1 km", specialty: "Fresh Produce", active: false },
  { name: "Sabon Gari Market", distance: "5.5 km", specialty: "General", active: true },
];

export default function Market() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: prices, isLoading, refetch } = useGetMarketPrices({ query: { queryKey: getGetMarketPricesQueryKey() } });
  const { data: summary } = useGetMarketSummary({ query: { queryKey: getGetMarketSummaryQueryKey() } });

  const filtered = prices?.filter((p) => {
    const matchesSearch = p.commodity.toLowerCase().includes(search.toLowerCase());
    const cat = COMMODITY_CATEGORIES[p.commodity] as Filter | undefined;
    const matchesFilter = filter === "all" || cat === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AgriMarket</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Kano Regional Markets •
              <span className="text-[#16A34A] font-semibold">Live Prices</span>
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search commodities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-100 rounded-xl h-10 text-sm"
          />
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filter === f
                  ? "bg-[#16A34A] text-white shadow-sm shadow-green-200"
                  : "bg-white text-gray-500 border border-gray-100"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Weekly Insights */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[#1E3A8A]" /> Weekly Insights
          </h2>
          <div className="space-y-2">
            {weeklyInsights.map((insight, i) => {
              const Icon = insight.icon;
              return (
                <div key={i} className={`flex items-center gap-3 ${insight.bg} rounded-xl px-3.5 py-3`}>
                  <Icon className={`w-4 h-4 ${insight.color} shrink-0`} />
                  <p className="text-xs font-medium text-gray-700 leading-tight">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Price Alerts from API summary */}
        {summary?.priceAlerts && summary.priceAlerts.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-2.5">Price Alerts</h2>
            <div className="space-y-2">
              {summary.priceAlerts.slice(0, 3).map((alert: string, i: number) => (
                <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FBBF24] shrink-0" />
                    <p className="text-xs text-gray-700 font-medium">{alert}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Live Prices Table */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-gray-900">Live Commodity Prices</h2>
            <span className="text-[10px] text-gray-400 font-medium">Updated today</span>
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr,auto] gap-0 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Commodity</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Price / Change</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.map((price) => {
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
                        <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold mt-0.5 ${
                          isRising ? "text-green-600" : isFalling ? "text-red-500" : "text-gray-400"
                        }`}>
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
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">No prices found.</CardContent>
            </Card>
          )}
        </section>

        {/* Nearby Markets */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-gray-900">Nearby Markets</h2>
          </div>
          <div className="space-y-2">
            {nearbyMarkets.map((mkt, i) => (
              <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mkt.active ? "bg-green-50" : "bg-gray-50"}`}>
                    <MapPin className={`w-5 h-5 ${mkt.active ? "text-[#16A34A]" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{mkt.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{mkt.specialty} • {mkt.distance}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mkt.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {mkt.active ? "Open" : "Closed"}
                    </span>
                    <button className="text-[10px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-1 rounded-lg">Directions</button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Price Prediction Banner */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <BarChart2 className="w-8 h-8 text-blue-200 shrink-0" />
              <div>
                <h3 className="text-white font-bold text-sm mb-1">AI Price Prediction</h3>
                <p className="text-blue-200 text-xs leading-relaxed mb-3">
                  Maize prices expected to rise 12% over next 30 days due to dry season supply constraints. Cowpea demand projected up 15% as demand peaks.
                </p>
                <Button size="sm" className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-xs h-8 rounded-xl px-4">
                  View Full Forecast
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
