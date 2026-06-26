import { Router } from "express";
import { db, farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE = "https://api.paystack.co";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly Pro",
    amount: 1500,
    currency: "NGN",
    description: "Unlimited FarmGPT messages, government grants, NGO programs, premium market insights",
    features: ["Unlimited AI messages", "Government grants & loans", "NGO programs", "Priority support", "Advanced market analysis"],
    popular: false,
  },
  {
    id: "quarterly",
    name: "3-Month Pro",
    amount: 3500,
    currency: "NGN",
    description: "Best value — save ₦1,000 vs monthly",
    features: ["Everything in Monthly", "Save ₦1,000", "Season planner", "Crop insurance info", "Export farm records"],
    popular: true,
  },
  {
    id: "yearly",
    name: "Annual Pro",
    amount: 10000,
    currency: "NGN",
    description: "Full year — save ₦8,000 vs monthly",
    features: ["Everything in Quarterly", "Save ₦8,000", "Free extension officer consult", "Priority scan credits", "Community group leader"],
    popular: false,
  },
];

router.get("/plans", (_req, res) => {
  res.json(PLANS);
});

router.get("/status", async (req, res) => {
  try {
    const [farmer] = await db.select({ credits: farmersTable.credits, name: farmersTable.name }).from(farmersTable).where(eq(farmersTable.id, req.farmerId!)).limit(1);
    res.json({ isPro: (farmer?.credits ?? 0) > 0, credits: farmer?.credits ?? 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/initialize", async (req, res) => {
  try {
    const { planId, email } = req.body;
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ error: "Invalid plan" });

    if (!PAYSTACK_SECRET) {
      return res.json({
        status: true,
        message: "Payment provider not configured. Contact support.",
        data: { authorization_url: null, reference: `frege_${Date.now()}` }
      });
    }

    const reference = `frege_${req.farmerId}_${Date.now()}`;
    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: plan.amount * 100,
        reference,
        currency: "NGN",
        metadata: { farmerId: req.farmerId, planId, planName: plan.name },
        channels: ["card", "bank", "ussd", "bank_transfer"],
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: "Reference required" });

    if (!PAYSTACK_SECRET) {
      await db.update(farmersTable).set({ credits: 1000 }).where(eq(farmersTable.id, req.farmerId!));
      return res.json({ status: true, message: "Pro access activated (test mode)" });
    }

    const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data: any = await response.json();

    if (data.data?.status === "success") {
      await db.update(farmersTable).set({ credits: 1000 }).where(eq(farmersTable.id, req.farmerId!));
      return res.json({ status: true, message: "Payment successful. Pro access activated!" });
    }

    return res.status(402).json({ status: false, message: "Payment not confirmed" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
