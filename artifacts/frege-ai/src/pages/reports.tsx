import React, { useState, useRef } from "react";
import {
  FileText, PlusCircle, TrendingUp, TrendingDown, Wallet,
  Share2, Copy, Eye, Trash2, ChevronDown, ChevronUp,
  Upload, File, CheckCircle2, ArrowLeft, Loader2, BarChart3,
  Shield, AlertCircle, X, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

function authFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("frege_auth_token");
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
}

type Tab = "records" | "documents" | "reports";

const INCOME_CATEGORIES = ["Sales – Crops", "Sales – Livestock", "Agri Grant", "Loan Received", "Other Income"];
const EXPENSE_CATEGORIES = ["Seeds & Seedlings", "Fertiliser", "Pesticides", "Labour", "Equipment", "Transport", "Other Expense"];
const DOC_TYPES = [
  { value: "title_deed", label: "Land Title / C of O" },
  { value: "certificate", label: "Farm Certificate" },
  { value: "insurance", label: "Insurance Policy" },
  { value: "permit", label: "Permit / License" },
  { value: "receipt", label: "Sales Receipt" },
  { value: "other", label: "Other Document" },
];

export default function Reports() {
  const { farmer } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("records");
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showGenReport, setShowGenReport] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [recordForm, setRecordForm] = useState({ type: "income", category: "", description: "", amountNgn: "", recordDate: new Date().toISOString().slice(0, 10) });
  const [docForm, setDocForm] = useState({ title: "", docType: "", notes: "", fileDataUrl: "" });
  const [reportForm, setReportForm] = useState({ title: "", notes: "" });

  const { data: records = [], isLoading: recLoading } = useQuery<any[]>({
    queryKey: ["finance-records"],
    queryFn: () => authFetch("/finance/records").then(r => r.json()),
  });

  const { data: docs = [], isLoading: docLoading } = useQuery<any[]>({
    queryKey: ["finance-docs"],
    queryFn: () => authFetch("/finance/documents").then(r => r.json()),
  });

  const { data: reports = [], isLoading: repLoading } = useQuery<any[]>({
    queryKey: ["farm-reports"],
    queryFn: () => authFetch("/reports").then(r => r.json()),
  });

  const addRecord = useMutation({
    mutationFn: (data: any) => authFetch("/finance/records", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-records"] }); setShowAddRecord(false); setRecordForm({ type: "income", category: "", description: "", amountNgn: "", recordDate: new Date().toISOString().slice(0, 10) }); toast({ title: "Record saved" }); },
    onError: () => toast({ title: "Failed to save record", variant: "destructive" }),
  });

  const deleteRecord = useMutation({
    mutationFn: (id: number) => authFetch(`/finance/records/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-records"] }); toast({ title: "Deleted" }); },
  });

  const addDoc = useMutation({
    mutationFn: (data: any) => authFetch("/finance/documents", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-docs"] }); setShowAddDoc(false); setDocForm({ title: "", docType: "", notes: "", fileDataUrl: "" }); toast({ title: "Document saved" }); },
    onError: () => toast({ title: "Failed to save document", variant: "destructive" }),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: number) => authFetch(`/finance/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-docs"] }); toast({ title: "Deleted" }); },
  });

  const genReport = useMutation({
    mutationFn: (data: any) => authFetch("/reports/generate", { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["farm-reports"] });
      setShowGenReport(false);
      setReportForm({ title: "", notes: "" });
      setTab("reports");
      toast({ title: "Report generated!", description: "Your shareable link is ready." });
    },
    onError: () => toast({ title: "Failed to generate report", variant: "destructive" }),
  });

  const deleteReport = useMutation({
    mutationFn: (id: number) => authFetch(`/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["farm-reports"] }); toast({ title: "Report deleted" }); },
  });

  const totalIncome = records.filter(r => r.type === "income").reduce((s: number, r: any) => s + (r.amountNgn ?? 0), 0);
  const totalExpense = records.filter(r => r.type === "expense").reduce((s: number, r: any) => s + (r.amountNgn ?? 0), 0);
  const net = totalIncome - totalExpense;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast({ title: "File too large (max 4MB)", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setDocForm(f => ({ ...f, fileDataUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function copyLink(report: any) {
    const shareUrl = `${window.location.origin}/share/${report.shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Link copied!", description: "Share with your bank or lender." });
    });
  }

  const fmtNgn = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E3A8A] text-white px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Finance & Reports</h1>
            <p className="text-xs text-blue-200">Records, documents & bank-ready reports</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-200 mb-0.5">Income</p>
            <p className="text-sm font-bold text-green-300">{fmtNgn(totalIncome)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-200 mb-0.5">Expenses</p>
            <p className="text-sm font-bold text-red-300">{fmtNgn(totalExpense)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-200 mb-0.5">Net Balance</p>
            <p className={`text-sm font-bold ${net >= 0 ? "text-green-300" : "text-red-300"}`}>{fmtNgn(net)}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b bg-white sticky top-0 z-10">
        {(["records", "documents", "reports"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors ${tab === t ? "text-[#1E3A8A] border-b-2 border-[#1E3A8A]" : "text-gray-400"}`}>
            {t === "records" ? "💰 Records" : t === "documents" ? "📄 Documents" : "📊 Reports"}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 pb-24">
        {tab === "records" && (
          <>
            <Button onClick={() => setShowAddRecord(true)} className="w-full bg-[#16A34A] hover:bg-green-700 gap-2">
              <PlusCircle className="w-4 h-4" /> Add Income / Expense
            </Button>

            {showAddRecord && (
              <Card className="border-green-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    {["income", "expense"].map(t => (
                      <button key={t} onClick={() => setRecordForm(f => ({ ...f, type: t, category: "" }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${recordForm.type === t ? (t === "income" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-400 text-red-700") : "border-gray-200 text-gray-400"}`}>
                        {t === "income" ? "💚 Income" : "🔴 Expense"}
                      </button>
                    ))}
                  </div>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={recordForm.category} onChange={e => setRecordForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category…</option>
                    {(recordForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Input placeholder="Description (e.g. Sold 500kg maize)" value={recordForm.description} onChange={e => setRecordForm(f => ({ ...f, description: e.target.value }))} />
                  <Input type="number" placeholder="Amount (₦)" value={recordForm.amountNgn} onChange={e => setRecordForm(f => ({ ...f, amountNgn: e.target.value }))} />
                  <Input type="date" value={recordForm.recordDate} onChange={e => setRecordForm(f => ({ ...f, recordDate: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAddRecord(false)}>Cancel</Button>
                    <Button className="flex-1 bg-[#16A34A]" disabled={addRecord.isPending || !recordForm.category || !recordForm.description || !recordForm.amountNgn}
                      onClick={() => addRecord.mutate({ ...recordForm, amountNgn: parseFloat(recordForm.amountNgn) })}>
                      {addRecord.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {recLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No records yet. Add your first income or expense.</p>
              </div>
            ) : (
              records.map((r: any) => (
                <Card key={r.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.type === "income" ? "bg-green-50" : "bg-red-50"}`}>
                      {r.type === "income" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.description}</p>
                      <p className="text-xs text-gray-400">{r.category} · {new Date(r.recordDate).toLocaleDateString("en-NG")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-bold ${r.type === "income" ? "text-green-600" : "text-red-500"}`}>
                        {r.type === "income" ? "+" : "-"}{fmtNgn(r.amountNgn)}
                      </span>
                      <button onClick={() => deleteRecord.mutate(r.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {tab === "documents" && (
          <>
            <Button onClick={() => setShowAddDoc(true)} className="w-full bg-[#1E3A8A] gap-2">
              <Upload className="w-4 h-4" /> Upload Document
            </Button>

            {showAddDoc && (
              <Card className="border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <Input placeholder="Document title (e.g. Farm Title Deed)" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} />
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={docForm.docType} onChange={e => setDocForm(f => ({ ...f, docType: e.target.value }))}>
                    <option value="">Select document type…</option>
                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <Textarea placeholder="Notes (optional)" rows={2} value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} />
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 transition-colors" onClick={() => fileRef.current?.click()}>
                    {docForm.fileDataUrl ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">File ready to upload</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Tap to upload file (PDF, JPG, PNG — max 4MB)</p>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                    <Button className="flex-1 bg-[#1E3A8A]" disabled={addDoc.isPending || !docForm.title || !docForm.docType}
                      onClick={() => addDoc.mutate(docForm)}>
                      {addDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {docLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
            ) : docs.length === 0 ? (
              <div className="text-center py-12">
                <File className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No documents yet. Upload your land deeds, certificates or permits.</p>
              </div>
            ) : (
              docs.map((d: any) => (
                <Card key={d.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <File className="w-4 h-4 text-[#1E3A8A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{d.title}</p>
                      <p className="text-xs text-gray-400">{DOC_TYPES.find(t => t.value === d.docType)?.label ?? d.docType} · {new Date(d.createdAt).toLocaleDateString("en-NG")}</p>
                      {d.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{d.notes}</p>}
                    </div>
                    <button onClick={() => deleteDoc.mutate(d.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {tab === "reports" && (
          <>
            <Card className="border-0 bg-gradient-to-br from-[#1E3A8A] to-[#1e40af] text-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1">Generate Verified Farm Report</h3>
                    <p className="text-xs text-blue-200 mb-3">Create a secure, read-only link for banks, insurers or lenders. They can view your live farm records without accessing your account.</p>
                    <Button onClick={() => setShowGenReport(true)} className="w-full bg-white text-[#1E3A8A] font-bold hover:bg-blue-50 text-sm">
                      <FileText className="w-4 h-4 mr-2" /> Generate New Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showGenReport && (
              <Card className="border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-gray-800">New Farm Report</h4>
                  <Input placeholder="Report title (e.g. Loan Application – GTBank)" value={reportForm.title} onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))} />
                  <Textarea placeholder="Notes for the reviewer (optional)" rows={2} value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} />
                  <div className="bg-amber-50 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">This will snapshot your farms, crops, animals, financial records and documents into a read-only report. Anyone with the link can view it.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowGenReport(false)}>Cancel</Button>
                    <Button className="flex-1 bg-[#1E3A8A]" disabled={genReport.isPending}
                      onClick={() => genReport.mutate(reportForm)}>
                      {genReport.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</> : "Generate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {repLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No reports yet. Generate one to share with your bank or lender.</p>
              </div>
            ) : (
              reports.map((r: any) => {
                const shareUrl = `${window.location.origin}/share/${r.shareToken}`;
                const snap = r.snapshot as any;
                return (
                  <Card key={r.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                            <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                          </div>
                          <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-NG")} · {r.viewCount ?? 0} views</p>
                        </div>
                        <button onClick={() => deleteReport.mutate(r.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400">Farms</p>
                          <p className="text-sm font-bold text-gray-700">{snap?.farms?.length ?? 0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400">Crops</p>
                          <p className="text-sm font-bold text-gray-700">{snap?.crops?.length ?? 0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400">Net</p>
                          <p className={`text-sm font-bold ${(snap?.financialSummary?.netNgn ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtNgn(snap?.financialSummary?.netNgn ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2 mb-2">
                        <p className="text-xs text-gray-500 flex-1 truncate">{shareUrl}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                          onClick={() => window.open(shareUrl, "_blank")}>
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                        <Button size="sm" className={`flex-1 gap-1.5 text-xs ${copiedId === r.id ? "bg-green-600" : "bg-[#1E3A8A]"}`}
                          onClick={() => copyLink(r)}>
                          {copiedId === r.id ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
