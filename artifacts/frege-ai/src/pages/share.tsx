import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  Shield, CheckCircle2, MapPin, Wheat, Tractor, BarChart3,
  TrendingUp, TrendingDown, FileText, Eye, Calendar, Loader2,
  AlertCircle, Leaf
} from "lucide-react";

const API_BASE = "/api";

interface ReportSnapshot {
  generatedAt: string;
  farmer: {
    name: string; state: string; lga: string; farmingType: string;
    verificationStatus: string; neuroScore: number; memberSince: string;
  };
  farms: Array<{ name: string; sizeHa: number; location: string; soilType: string; irrigationType: string }>;
  crops: Array<{ cropType: string; variety: string; sizeHa: number; healthScore: number; growthStage: string; lastYieldKg: number }>;
  livestock: Array<{ animalType: string; breed: string; count: number; healthStatus: string; productionPurpose: string }>;
  financialSummary: {
    totalIncomeNgn: number; totalExpenseNgn: number; netNgn: number; recordCount: number;
    records: Array<{ type: string; category: string; description: string; amountNgn: number; recordDate: string }>;
  };
  documents: Array<{ title: string; docType: string; notes: string; createdAt: string }>;
  recentDiagnoses: Array<{ scanType: string; diagnosis: string; confidence: number; severity: string; description: string; createdAt: string }>;
}

interface SharedReport {
  id: number; title: string; notes: string; viewCount: number; createdAt: string;
  snapshot: ReportSnapshot;
}

function fmtNgn(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#1E3A8A]" />
        <h3 className="font-bold text-sm text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SharePage() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token;
  const [report, setReport] = useState<SharedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/share/${token}`)
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e.error || "Not found"));
        return r.json();
      })
      .then(data => { setReport(data); setLoading(false); })
      .catch(err => { setError(typeof err === "string" ? err : "Failed to load report"); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading verified report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="font-bold text-gray-800 mb-2">Report Not Found</h2>
          <p className="text-gray-500 text-sm">{error ?? "This report link may have expired or been removed."}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by FREGE AI</span>
          </div>
        </div>
      </div>
    );
  }

  const snap = report.snapshot;
  const f = snap.farmer;
  const totalArea = snap.farms.reduce((s, fa) => s + (fa.sizeHa ?? 0), 0);
  const memberYears = Math.floor((Date.now() - new Date(f.memberSince).getTime()) / (365.25 * 24 * 3600 * 1000));

  const DOC_LABELS: Record<string, string> = {
    title_deed: "Land Title / C of O", certificate: "Farm Certificate",
    insurance: "Insurance Policy", permit: "Permit / License",
    receipt: "Sales Receipt", other: "Other Document",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E3A8A] text-white px-4 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">FREGE AI — Verified Farm Report</div>
            <h1 className="text-base font-bold leading-tight">{report.title}</h1>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🌾</div>
            <div className="flex-1">
              <h2 className="font-bold text-lg leading-tight">{f.name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                <span className="text-xs text-green-300 font-medium">Verified Farmer</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3 h-3 text-blue-200" />
                <span className="text-xs text-blue-200">{f.lga ? `${f.lga}, ` : ""}{f.state}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-blue-200">Farming</p>
              <p className="text-xs font-semibold capitalize mt-0.5">{f.farmingType}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-blue-200">Total Land</p>
              <p className="text-xs font-semibold mt-0.5">{totalArea.toFixed(1)} ha</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-blue-200">Member Since</p>
              <p className="text-xs font-semibold mt-0.5">{memberYears < 1 ? "< 1yr" : `${memberYears}yr`}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-blue-200">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span>Generated {new Date(snap.generatedAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            <span>{report.viewCount} views</span>
          </div>
        </div>

        {report.notes && (
          <div className="mt-3 bg-white/10 rounded-xl p-3 text-xs text-blue-100">{report.notes}</div>
        )}
      </div>

      <div className="p-4">
        <Section title="Farm Overview" icon={Leaf}>
          {snap.farms.length === 0 ? <p className="text-sm text-gray-400">No farms on record.</p> : (
            <div className="space-y-2">
              {snap.farms.map((farm, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{farm.name}</p>
                    <p className="text-xs text-gray-400">{farm.location} · {farm.soilType ?? "—"} soil · {farm.irrigationType ?? "rainfed"}</p>
                  </div>
                  <span className="text-sm font-bold text-[#1E3A8A] shrink-0 ml-2">{farm.sizeHa} ha</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {snap.crops.length > 0 && (
          <Section title="Crops" icon={Wheat}>
            <div className="space-y-2">
              {snap.crops.map((c, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-sm font-semibold text-gray-800 capitalize">{c.cropType}{c.variety ? ` – ${c.variety}` : ""}</p>
                    <span className="text-xs text-gray-400">{c.sizeHa} ha</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400">Health</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${c.healthScore ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{c.healthScore ?? "—"}%</span>
                      </div>
                    </div>
                    {c.lastYieldKg != null && (
                      <div>
                        <p className="text-[10px] text-gray-400">Last Yield</p>
                        <p className="text-xs font-semibold text-gray-600 mt-0.5">{c.lastYieldKg} kg</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-gray-400">Stage</p>
                      <p className="text-xs font-semibold text-gray-600 capitalize mt-0.5">{c.growthStage ?? "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {snap.livestock.length > 0 && (
          <Section title="Livestock" icon={Tractor}>
            <div className="space-y-2">
              {snap.livestock.map((a, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 capitalize">{a.animalType}{a.breed ? ` – ${a.breed}` : ""}</p>
                    <p className="text-xs text-gray-400 capitalize">{a.productionPurpose ?? "—"} · {a.healthStatus ?? "—"}</p>
                  </div>
                  <span className="text-sm font-bold text-[#1E3A8A]">{a.count} head</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Financial Summary" icon={BarChart3}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 mb-1">Total Income</p>
              <p className="text-sm font-bold text-green-700">{fmtNgn(snap.financialSummary.totalIncomeNgn)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 mb-1">Expenses</p>
              <p className="text-sm font-bold text-red-600">{fmtNgn(snap.financialSummary.totalExpenseNgn)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${snap.financialSummary.netNgn >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
              <p className="text-[10px] text-gray-500 mb-1">Net</p>
              <p className={`text-sm font-bold ${snap.financialSummary.netNgn >= 0 ? "text-[#1E3A8A]" : "text-orange-600"}`}>
                {fmtNgn(snap.financialSummary.netNgn)}
              </p>
            </div>
          </div>
          {snap.financialSummary.records.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500">Recent Transactions ({snap.financialSummary.recordCount} total)</p>
              </div>
              {snap.financialSummary.records.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-gray-50 last:border-0">
                  {r.type === "income"
                    ? <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{r.description}</p>
                    <p className="text-[10px] text-gray-400">{r.category}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${r.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {r.type === "income" ? "+" : "-"}{fmtNgn(r.amountNgn)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {snap.documents.length > 0 && (
          <Section title="Documents on File" icon={FileText}>
            <div className="space-y-2">
              {snap.documents.map((d, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#1E3A8A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.title}</p>
                    <p className="text-xs text-gray-400">{DOC_LABELS[d.docType] ?? d.docType}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {snap.recentDiagnoses.length > 0 && (
          <Section title="Recent AI Diagnoses" icon={Leaf}>
            <div className="space-y-2">
              {snap.recentDiagnoses.map((d, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-gray-800 capitalize">{d.diagnosis}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.severity === "low" ? "bg-green-50 text-green-700" : d.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                      {d.severity} risk
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{d.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Confidence: {Math.round((d.confidence ?? 0) * 100)}% · {new Date(d.createdAt).toLocaleDateString("en-NG")}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="mt-8 border-t border-gray-200 pt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#1E3A8A]" />
            <span className="text-sm font-bold text-[#1E3A8A]">Verified by FREGE AI</span>
          </div>
          <p className="text-xs text-gray-400">This report is read-only and does not grant access to the farmer's account. Data is live and reflects the farmer's records at time of generation.</p>
          <p className="text-[10px] text-gray-300 mt-2">fregeai.com · Trusted farming intelligence for West Africa</p>
        </div>
      </div>
    </div>
  );
}
