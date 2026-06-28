import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell, Syringe, AlertTriangle, CheckCircle, Clock, ChevronLeft,
  Loader2, MessageSquare, Calendar, Plus, Edit2, X, RefreshCw,
  Smartphone, Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";

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

interface Reminder {
  id: number;
  species: string;
  breed: string | null;
  count: number;
  healthStatus: string;
  healthScore: number;
  lastVaccinationDate: string | null;
  nextVaccinationDate: string | null;
  notes: string | null;
  daysUntilVaccination: number | null;
  urgency: "none" | "overdue" | "today" | "urgent" | "soon" | "ok";
}

const URGENCY_CONFIG = {
  overdue: { label: "OVERDUE", bg: "bg-red-100", text: "text-red-700", border: "border-red-200", icon: AlertTriangle, iconColor: "text-red-500" },
  today: { label: "TODAY", bg: "bg-red-50", text: "text-red-600", border: "border-red-100", icon: Bell, iconColor: "text-red-500" },
  urgent: { label: "URGENT (≤3d)", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", icon: AlertTriangle, iconColor: "text-orange-500" },
  soon: { label: "SOON (≤7d)", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", icon: Clock, iconColor: "text-amber-500" },
  ok: { label: "SCHEDULED", bg: "bg-green-50", text: "text-green-700", border: "border-green-100", icon: CheckCircle, iconColor: "text-green-500" },
  none: { label: "NOT SET", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-100", icon: Calendar, iconColor: "text-gray-400" },
};

export default function Reminders() {
  const [, setLocation] = useLocation();
  const { farmer } = useAuth();
  const { toast } = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ nextVaccinationDate: "", lastVaccinationDate: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authFetch("/notifications/reminders");
      const data = await r.json();
      setReminders(data.reminders ?? []);
    } catch {
      toast({ title: "Could not load reminders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendSms = async (reminder: Reminder) => {
    setSendingId(reminder.id);
    try {
      const r = await authFetch(`/notifications/reminders/${reminder.id}/send-sms`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to send SMS");
      toast({ title: data.sent ? "SMS sent!" : "Reminder saved", description: data.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  const startEdit = (r: Reminder) => {
    setEditingId(r.id);
    setEditData({
      nextVaccinationDate: r.nextVaccinationDate ?? "",
      lastVaccinationDate: r.lastVaccinationDate ?? "",
      notes: r.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const r = await authFetch(`/notifications/reminders/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          nextVaccinationDate: editData.nextVaccinationDate || null,
          lastVaccinationDate: editData.lastVaccinationDate || null,
          notes: editData.notes || null,
        }),
      });
      if (!r.ok) throw new Error("Failed to save");
      toast({ title: "Reminder updated!" });
      setEditingId(null);
      load();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const urgentCount = reminders.filter((r) => ["overdue", "today", "urgent"].includes(r.urgency)).length;
  const soonCount = reminders.filter((r) => r.urgency === "soon").length;
  const hasPhone = !!farmer?.phone;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/farm")} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Vaccination Reminders</h1>
              {urgentCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{urgentCount}</span>
              )}
            </div>
            <p className="text-xs text-gray-500">Track & schedule livestock vaccinations</p>
          </div>
          <button onClick={load} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* SMS Status Banner */}
        <Card className={`rounded-2xl border-0 shadow-sm ${hasPhone ? "bg-green-50" : "bg-amber-50"}`}>
          <CardContent className="p-3.5 flex items-start gap-3">
            <Smartphone className={`w-5 h-5 shrink-0 mt-0.5 ${hasPhone ? "text-[#16A34A]" : "text-amber-600"}`} />
            <div>
              {hasPhone ? (
                <>
                  <p className="text-xs font-bold text-[#16A34A]">SMS Reminders Ready</p>
                  <p className="text-xs text-gray-600">Reminders will be sent to <span className="font-bold">{farmer.phone}</span>. Requires Termii or Twilio API key in server settings to deliver.</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-amber-700">Add Phone Number for SMS</p>
                  <p className="text-xs text-gray-600">Update your profile with a phone number to receive SMS vaccination reminders.</p>
                  <button onClick={() => setLocation("/settings")} className="text-xs font-bold text-amber-700 underline mt-1">Go to Settings →</button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {!loading && reminders.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-black text-red-500">{urgentCount}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Need Attention</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-black text-amber-500">{soonCount}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Due This Week</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-black text-[#16A34A]">{reminders.length}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Total Animals</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reminders List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="p-8 text-center">
              <Syringe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-500 mb-1">No livestock added yet</p>
              <p className="text-xs text-gray-400 mb-4">Add livestock in your Farm page to set vaccination reminders.</p>
              <Button onClick={() => setLocation("/farm")} className="bg-[#1E3A8A] text-white rounded-xl text-sm font-bold h-10">
                <Plus className="w-4 h-4 mr-1" /> Go to Farm
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reminders
              .sort((a, b) => {
                const order = { overdue: 0, today: 1, urgent: 2, soon: 3, ok: 4, none: 5 };
                return (order[a.urgency] ?? 5) - (order[b.urgency] ?? 5);
              })
              .map((reminder) => {
                const cfg = URGENCY_CONFIG[reminder.urgency];
                const Icon = cfg.icon;
                const isEditing = editingId === reminder.id;

                return (
                  <Card key={reminder.id} className={`rounded-2xl border shadow-sm ${cfg.border} bg-white overflow-hidden`}>
                    {(reminder.urgency === "overdue" || reminder.urgency === "today" || reminder.urgency === "urgent") && (
                      <div className="h-0.5 w-full bg-red-400" />
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h3 className="font-bold text-gray-900 text-sm">
                              {reminder.count}× {reminder.species}
                              {reminder.breed ? <span className="text-gray-400 font-normal"> ({reminder.breed})</span> : ""}
                            </h3>
                            <Badge className={`text-[8px] font-black border-0 shrink-0 ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Syringe className="w-3 h-3" />
                              {reminder.nextVaccinationDate
                                ? new Date(reminder.nextVaccinationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                : "No date set"}
                            </span>
                            {reminder.daysUntilVaccination !== null && (
                              <span className={`font-bold ${reminder.daysUntilVaccination < 0 ? "text-red-500" : reminder.daysUntilVaccination <= 3 ? "text-orange-600" : "text-gray-500"}`}>
                                {reminder.daysUntilVaccination < 0
                                  ? `${Math.abs(reminder.daysUntilVaccination)}d overdue`
                                  : reminder.daysUntilVaccination === 0
                                  ? "Due today!"
                                  : `${reminder.daysUntilVaccination}d away`}
                              </span>
                            )}
                          </div>
                          {reminder.lastVaccinationDate && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Last: {new Date(reminder.lastVaccinationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                          {reminder.notes && (
                            <p className="text-[10px] text-gray-500 mt-0.5 italic">{reminder.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Edit form */}
                      {isEditing ? (
                        <div className="space-y-2.5 pt-2 border-t border-gray-100">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Next Vaccination Date</label>
                            <Input
                              type="date"
                              value={editData.nextVaccinationDate}
                              onChange={(e) => setEditData((p) => ({ ...p, nextVaccinationDate: e.target.value }))}
                              className="h-10 rounded-xl text-sm border-gray-200"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Last Vaccination Date</label>
                            <Input
                              type="date"
                              value={editData.lastVaccinationDate}
                              onChange={(e) => setEditData((p) => ({ ...p, lastVaccinationDate: e.target.value }))}
                              className="h-10 rounded-xl text-sm border-gray-200"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Notes (vaccine name, vet, etc.)</label>
                            <Input
                              type="text"
                              placeholder="e.g. Newcastle disease vaccine, Dr. Adebayo"
                              value={editData.notes}
                              onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                              className="h-10 rounded-xl text-sm border-gray-200"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={saveEdit}
                              disabled={savingEdit}
                              className="flex-1 h-9 rounded-xl bg-[#16A34A] text-white font-bold text-xs"
                            >
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Save</>}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              className="flex-1 h-9 rounded-xl font-bold text-xs border-gray-200"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => startEdit(reminder)}
                            variant="outline"
                            className="flex-1 h-9 rounded-xl font-bold text-xs border-gray-200 text-gray-700"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            {reminder.nextVaccinationDate ? "Edit Date" : "Set Date"}
                          </Button>
                          <Button
                            onClick={() => sendSms(reminder)}
                            disabled={sendingId === reminder.id || !hasPhone}
                            className="flex-1 h-9 rounded-xl bg-[#1E3A8A] text-white font-bold text-xs"
                          >
                            {sendingId === reminder.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <><MessageSquare className="w-3.5 h-3.5 mr-1" />Send SMS</>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {/* How it works */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#1E3A8A] to-blue-700 shadow-lg">
          <CardContent className="p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-200" />
              <p className="text-sm font-bold">How SMS Reminders Work</p>
            </div>
            <div className="space-y-1.5">
              {[
                "Set vaccination dates for each animal using the 'Set Date' button",
                "Tap 'Send SMS' to receive an instant reminder on your phone",
                "Overdue and urgent reminders appear first with a red indicator",
                "Add TERMII_API_KEY to server settings to enable automatic SMS delivery",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-blue-100">
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
