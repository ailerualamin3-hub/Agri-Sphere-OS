import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Star, Zap, Lock, ArrowLeft, CreditCard, Building2, Smartphone, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
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

const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "₦1,500",
    period: "/month",
    description: "Try it out",
    features: ["Unlimited FarmGPT messages", "Government grants & loans", "NGO programs", "Market price alerts"],
    popular: false,
    color: "border-gray-200",
    badge: "",
  },
  {
    id: "quarterly",
    name: "3 Months",
    price: "₦3,500",
    period: "/3 months",
    description: "Save ₦1,000",
    features: ["Everything in Monthly", "Save ₦1,000", "Season planner", "Export farm records"],
    popular: true,
    color: "border-[#16A34A]",
    badge: "Most Popular",
  },
  {
    id: "yearly",
    name: "1 Year",
    price: "₦10,000",
    period: "/year",
    description: "Best value — save ₦8,000",
    features: ["Everything in 3 Months", "Save ₦8,000", "Free extension officer consult", "Priority scan credits"],
    popular: false,
    color: "border-[#1E3A8A]",
    badge: "Best Value",
  },
];

const PAY_METHODS = [
  { id: "card", label: "Debit/Credit Card", icon: CreditCard, desc: "Visa, Mastercard, Verve" },
  { id: "bank", label: "Bank Transfer", icon: Building2, desc: "Pay directly from your bank" },
  { id: "ussd", label: "OPay / USSD", icon: Smartphone, desc: "Dial *322# or use OPay app" },
];

export default function Payment() {
  const [, setLocation] = useLocation();
  const { farmer } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("quarterly");
  const [payMethod, setPayMethod] = useState("card");
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    apiFetch("/payment/status").then(d => setIsPro(d.isPro)).catch(() => {});
  }, []);

  const handlePay = async () => {
    if (!farmer?.email) {
      toast({ title: "Email required", description: "Please add your email in Profile first.", variant: "destructive" });
      return;
    }
    setIsPaying(true);
    try {
      const data = await apiFetch("/payment/initialize", {
        method: "POST",
        body: JSON.stringify({ planId: selectedPlan, email: farmer.email }),
      });
      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        toast({ title: "Payment not configured", description: "Contact support to activate Pro access.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not start payment. Try again.", variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  };

  if (isPro) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 pb-24">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-10 h-10 text-[#16A34A]" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">You are Pro!</h1>
        <p className="text-gray-500 text-center mb-6">You have full access to all FREGE AI features.</p>
        <Button onClick={() => setLocation("/home")} className="bg-[#16A34A] text-white font-bold h-12 px-8 rounded-2xl">
          Go to My Farm
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-[#1E3A8A] to-[#16A34A] px-4 pt-12 pb-8">
        <button onClick={() => setLocation(-1 as any)} className="flex items-center gap-1.5 text-white/70 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-3">
            <Star className="w-4 h-4 text-[#FBBF24]" />
            <span className="text-white text-sm font-bold">Upgrade to Pro</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Unlock Everything</h1>
          <p className="text-blue-100 text-sm">Unlimited AI help, government grants, market alerts</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Plans */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full text-left rounded-2xl border-2 bg-white p-4 transition-all ${selectedPlan === plan.id ? plan.color : "border-gray-100"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-gray-900">{plan.name}</span>
                    {plan.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.popular ? "bg-green-100 text-[#16A34A]" : "bg-blue-100 text-[#1E3A8A]"}`}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{plan.description}</p>
                  <ul className="mt-2 space-y-1">
                    {plan.features.slice(0, 2).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-[#16A34A] shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xl font-black text-gray-900">{plan.price}</p>
                  <p className="text-xs text-gray-400">{plan.period}</p>
                  <div className={`mt-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? "border-[#16A34A] bg-[#16A34A]" : "border-gray-300"}`}>
                    {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Payment Method */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">How do you want to pay?</h3>
            <div className="space-y-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPayMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${payMethod === m.id ? "border-[#16A34A] bg-green-50" : "border-gray-100 bg-gray-50"}`}
                >
                  <m.icon className={`w-5 h-5 ${payMethod === m.id ? "text-[#16A34A]" : "text-gray-400"}`} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{m.label}</p>
                    <p className="text-xs text-gray-400">{m.desc}</p>
                  </div>
                  <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === m.id ? "border-[#16A34A] bg-[#16A34A]" : "border-gray-300"}`}>
                    {payMethod === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* USSD instructions */}
        {payMethod === "ussd" && (
          <Card className="rounded-2xl border-0 bg-amber-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">OPay / USSD Instructions</p>
              <ol className="space-y-1.5 text-xs text-amber-700">
                <li>1. Dial <strong>*955#</strong> on your phone (OPay)</li>
                <li>2. Select "Transfer" → "To OPay User"</li>
                <li>3. Send to FREGE AI account number (shown after clicking Pay)</li>
                <li>4. Use your reference code as narration</li>
                <li>5. Take a screenshot and send to our WhatsApp for activation</li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 px-2">
          <Lock className="w-4 h-4 text-gray-300" />
          <p className="text-xs text-gray-400">Your payment is secured by Paystack. FREGE AI never stores your card details.</p>
        </div>

        {/* Pay button */}
        <Button
          onClick={handlePay}
          disabled={isPaying}
          className="w-full h-14 bg-[#16A34A] hover:bg-[#15803d] text-white font-black text-base rounded-2xl shadow-lg"
        >
          {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Pay {PLANS.find(p => p.id === selectedPlan)?.price} — Go Pro
            </>
          )}
        </Button>

        <p className="text-center text-xs text-gray-400 pb-4">
          Cancel anytime. No hidden fees. Questions? WhatsApp: <strong>0800-FREGE-AI</strong>
        </p>
      </div>
    </div>
  );
}
