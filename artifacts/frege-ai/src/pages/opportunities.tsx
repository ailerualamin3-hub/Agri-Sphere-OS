import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Landmark, GraduationCap, Tractor, Syringe, Wheat, ChevronRight,
  Calendar, Mail, ExternalLink, MapPin, Users, Gift,
  Star, Filter, Building2, Globe2, Lock, Zap, CheckCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetOpportunities,
  getGetOpportunitiesQueryKey,
} from "@workspace/api-client-react";

type FilterType = "all" | "government" | "ngo" | "grant" | "subsidy" | "training" | "equipment";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  grant: <Landmark className="w-5 h-5" />,
  subsidy: <Gift className="w-5 h-5" />,
  loan: <Landmark className="w-5 h-5" />,
  training: <GraduationCap className="w-5 h-5" />,
  equipment: <Tractor className="w-5 h-5" />,
  vaccination: <Syringe className="w-5 h-5" />,
  seed_distribution: <Wheat className="w-5 h-5" />,
  other: <Star className="w-5 h-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  grant: "bg-green-50 text-[#16A34A]",
  subsidy: "bg-amber-50 text-amber-600",
  loan: "bg-blue-50 text-[#1E3A8A]",
  training: "bg-purple-50 text-purple-600",
  equipment: "bg-orange-50 text-orange-600",
  vaccination: "bg-red-50 text-red-500",
  seed_distribution: "bg-emerald-50 text-emerald-600",
  other: "bg-gray-50 text-gray-500",
};

const PROVIDER_COLORS: Record<string, string> = {
  government: "bg-[#1E3A8A]/10 text-[#1E3A8A]",
  ngo: "bg-green-100 text-[#16A34A]",
  cooperative: "bg-amber-100 text-amber-700",
  private: "bg-gray-100 text-gray-600",
};

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "government", label: "Govt" },
  { id: "ngo", label: "NGO" },
  { id: "grant", label: "Grants" },
  { id: "subsidy", label: "Subsidies" },
  { id: "training", label: "Training" },
];

function OpportunityCard({ opp, onExpand, onLocked }: { opp: any; onExpand: (o: any) => void; onLocked: () => void }) {
  const iconColor = TYPE_COLORS[opp.opportunityType] ?? "bg-gray-50 text-gray-500";
  const icon = TYPE_ICONS[opp.opportunityType] ?? <Star className="w-5 h-5" />;
  const daysLeft = opp.deadline
    ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Card className={`rounded-2xl border-0 bg-white shadow-sm overflow-hidden ${opp.isFeatured ? "ring-1 ring-[#FBBF24]/40" : ""}`}>
      {opp.isFeatured && (
        <div className="h-0.5 w-full bg-gradient-to-r from-[#FBBF24] via-[#16A34A] to-[#1E3A8A]" />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{opp.title}</h3>
              {opp.isFeatured && (
                <Badge className="bg-[#FBBF24]/20 text-amber-700 border-0 text-[9px] font-bold shrink-0">Featured</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={`${PROVIDER_COLORS[opp.providerType] ?? "bg-gray-100 text-gray-600"} border-0 text-[10px] font-bold`}>
                {opp.providerType === "government" ? <Building2 className="w-3 h-3 mr-0.5" /> : <Globe2 className="w-3 h-3 mr-0.5" />}
                {opp.provider.split(" / ")[0]}
              </Badge>
              <Badge className={`border-0 text-[10px] font-bold capitalize ${iconColor}`}>
                {opp.opportunityType.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{opp.description}</p>

        <div className="flex items-center gap-3 mb-3">
          {opp.amountDescription && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A]">
              <Landmark className="w-3.5 h-3.5" />
              {opp.amountDescription}
            </div>
          )}
          {daysLeft !== null && daysLeft > 0 && (
            <div className={`flex items-center gap-1.5 text-xs font-bold ${daysLeft <= 14 ? "text-red-500" : "text-gray-500"}`}>
              <Calendar className="w-3.5 h-3.5" />
              {daysLeft <= 14 ? `${daysLeft}d left` : `Deadline: ${new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </div>
          )}
        </div>

        {opp.targetStates?.[0] && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mb-3">
            <MapPin className="w-3 h-3" />
            {opp.targetStates.slice(0, 3).join(", ")}{opp.targetStates.length > 3 ? ` +${opp.targetStates.length - 3} more` : ""}
          </div>
        )}

        {opp.locked ? (
          <Button
            onClick={onLocked}
            className="w-full h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" /> Upgrade to Pro to View
          </Button>
        ) : (
          <Button
            onClick={() => onExpand(opp)}
            className="w-full h-9 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5"
          >
            View Details & Apply <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function OpportunityDetail({ opp, onClose }: { opp: any; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const iconColor = TYPE_COLORS[opp.opportunityType] ?? "bg-gray-50 text-gray-500";
  const icon = TYPE_ICONS[opp.opportunityType] ?? <Star className="w-5 h-5" />;

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      <button onClick={onClose} className="flex items-center gap-2 text-xs font-bold text-[#16A34A] mb-1">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Opportunities
      </button>

      <Card className="rounded-2xl border-0 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconColor}`}>
              {icon}
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 leading-tight mb-1">{opp.title}</h2>
              <Badge className={`${PROVIDER_COLORS[opp.providerType] ?? "bg-gray-100 text-gray-600"} border-0 text-[10px] font-bold`}>
                {opp.provider}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{opp.description}</p>
        </CardContent>
      </Card>

      {opp.amountDescription && (
        <Card className="rounded-2xl border-0 bg-[#16A34A]/5 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wide mb-1">Benefit / Amount</p>
            <p className="text-base font-black text-[#16A34A]">{opp.amountDescription}</p>
          </CardContent>
        </Card>
      )}

      {opp.deadline && (
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#1E3A8A]" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Application Deadline</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date(opp.deadline).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#16A34A]" /> Eligibility Requirements
        </h3>
        <div className="space-y-2">
          {opp.requirements?.length > 0 ? opp.requirements.map((req: string, i: number) => (
            <div key={i} className="flex items-start gap-2.5 bg-white rounded-xl p-3 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-[#16A34A] mt-0.5 shrink-0" />
              <p className="text-xs text-gray-700 leading-tight">{req}</p>
            </div>
          )) : (
            <p className="text-xs text-gray-400 italic">No specific requirements listed.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-500" /> What You Get
        </h3>
        <div className="space-y-2">
          {opp.benefits?.length > 0 ? opp.benefits.map((benefit: string, i: number) => (
            <div key={i} className="flex items-start gap-2.5 bg-green-50 rounded-xl p-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p className="text-xs text-gray-700 leading-tight">{benefit}</p>
            </div>
          )) : (
            <p className="text-xs text-gray-400 italic">No benefits listed.</p>
          )}
        </div>
      </div>

      {/* Contact & Apply — NO phone/call buttons */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">How to Apply</h3>
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="p-4 space-y-3">
            {opp.applicationUrl && (
              <a
                href={opp.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#16A34A] text-white rounded-xl py-3.5 font-bold text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Apply Online Now
              </a>
            )}
            {opp.contactEmail && (
              <a
                href={`mailto:${opp.contactEmail}`}
                className="flex items-center gap-3 text-sm font-semibold text-[#1E3A8A] bg-blue-50 rounded-xl p-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold">Send an email</p>
                  <p className="text-xs font-bold text-[#1E3A8A]">{opp.contactEmail}</p>
                </div>
              </a>
            )}
            {!opp.applicationUrl && !opp.contactEmail && (
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600 font-semibold">
                  Visit your nearest Agricultural Development Programme (ADP) office or State Ministry of Agriculture to apply.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FarmGPT tip */}
      <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
        <CardContent className="p-4 text-white">
          <p className="text-sm font-bold mb-1">Need help applying?</p>
          <p className="text-xs text-blue-200 mb-3">Ask FarmGPT to help you write your application or explain the requirements in your language.</p>
          <Button
            onClick={() => setLocation("/farmgpt")}
            className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold text-sm h-9 w-full rounded-xl"
          >
            Ask FarmGPT for Help
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Opportunities() {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedOpp, setSelectedOpp] = useState<any>(null);

  const { data: opportunities, isLoading } = useGetOpportunities({
    query: { queryKey: getGetOpportunitiesQueryKey() },
  });

  const hasLocked = opportunities?.some((o: any) => o.locked) ?? false;

  const filtered = opportunities?.filter((opp: any) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "government" || activeFilter === "ngo") return opp.providerType === activeFilter;
    return opp.opportunityType === activeFilter;
  }) ?? [];

  if (selectedOpp) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Opportunity Details</h1>
        </div>
        <OpportunityDetail opp={selectedOpp} onClose={() => setSelectedOpp(null)} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-xs text-gray-500">Real government & NGO programmes for Nigerian farmers</p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeFilter === tab.id
                  ? "bg-[#1E3A8A] text-white shadow-sm"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {hasLocked && (
          <button onClick={() => setLocation("/payment")} className="w-full mb-4">
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#16A34A] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-white">Upgrade to Pro — from ₦20,000/month</p>
                <p className="text-xs text-blue-100">Unlock all government grants, NGO programs & loans</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white shrink-0" />
            </div>
          </button>
        )}

        {/* Info banner */}
        <Card className="rounded-2xl border-0 bg-green-50 shadow-sm mb-4">
          <CardContent className="p-3 flex gap-3 items-start">
            <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              All programs listed are <span className="font-bold text-[#16A34A]">real Nigerian government and NGO initiatives</span>. Tap any to see requirements and apply directly.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400 font-semibold">{filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} available</p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Filter className="w-3 h-3" /> Filtered
              </div>
            </div>
            <div className="space-y-4">
              {filtered.map((opp: any) => (
                <OpportunityCard key={opp.id} opp={opp} onExpand={setSelectedOpp} onLocked={() => setLocation("/payment")} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Landmark className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-500 mb-1">No opportunities found</p>
            <p className="text-xs text-gray-400">Try a different filter or check back soon.</p>
            <Button
              onClick={() => setActiveFilter("all")}
              variant="outline"
              className="mt-4 rounded-xl font-bold text-sm border-2"
            >
              Clear Filter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
