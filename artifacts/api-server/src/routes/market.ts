import { Router } from "express";
import { db, marketPricesTable, marketListingsTable, farmersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const SEED_PRICES = [
  { commodity: "Maize", pricePerKg: 450, unit: "kg", market: "Dawanau Grain Market", state: "Kano", trend: "rising", changePercent: 5.2 },
  { commodity: "Rice (local)", pricePerKg: 680, unit: "kg", market: "Wuse Market", state: "Abuja", trend: "stable", changePercent: 0.8 },
  { commodity: "Sorghum", pricePerKg: 320, unit: "kg", market: "Giwa Market", state: "Kaduna", trend: "stable", changePercent: -0.5 },
  { commodity: "Cowpea", pricePerKg: 530, unit: "kg", market: "Dawanau Grain Market", state: "Kano", trend: "rising", changePercent: 3.1 },
  { commodity: "Groundnut", pricePerKg: 610, unit: "kg", market: "Katsina Market", state: "Katsina", trend: "rising", changePercent: 7.4 },
  { commodity: "Tomatoes", pricePerKg: 220, unit: "kg", market: "Mile 12 Market", state: "Lagos", trend: "falling", changePercent: -12.3 },
  { commodity: "Onions", pricePerKg: 290, unit: "kg", market: "Kebbi Market", state: "Kebbi", trend: "stable", changePercent: 1.2 },
  { commodity: "Cassava (flour)", pricePerKg: 380, unit: "kg", market: "Bodija Market", state: "Oyo", trend: "rising", changePercent: 4.6 },
  { commodity: "Yam", pricePerKg: 420, unit: "kg", market: "Ogbete Market", state: "Enugu", trend: "stable", changePercent: 0.3 },
  { commodity: "Goat (live)", pricePerKg: 2200, unit: "head", market: "Rimi Cattle Market", state: "Kano", trend: "rising", changePercent: 8.0 },
  { commodity: "Cattle (live)", pricePerKg: 38000, unit: "head", market: "Rimi Cattle Market", state: "Kano", trend: "rising", changePercent: 6.5 },
  { commodity: "Poultry (live)", pricePerKg: 4200, unit: "crate", market: "Oshodi Market", state: "Lagos", trend: "stable", changePercent: 1.0 },
  { commodity: "Fertilizer (NPK)", pricePerKg: 920, unit: "50kg bag", market: "Agro-input Stores", state: "Nationwide", trend: "falling", changePercent: -3.2 },
  { commodity: "Pepper (dry)", pricePerKg: 1400, unit: "kg", market: "Dawanau Grain Market", state: "Kano", trend: "rising", changePercent: 9.1 },
];

const NEARBY_MARKETS: Record<string, Array<{ name: string; specialty: string; days: string; hours: string; lat?: number; lng?: number }>> = {
  default: [
    { name: "Dawanau Grain Market", specialty: "Grains & Pulses", days: "Mon–Sat", hours: "7am–6pm" },
    { name: "Rimi Cattle Market", specialty: "Livestock", days: "Tue & Fri", hours: "8am–4pm" },
    { name: "Yankaba Produce Market", specialty: "Fresh Produce", days: "Daily", hours: "6am–8pm" },
    { name: "Sabon Gari Market", specialty: "General Agric", days: "Daily", hours: "8am–7pm" },
  ],
  Lagos: [
    { name: "Mile 12 International Market", specialty: "Fresh Produce & Grains", days: "Daily", hours: "5am–8pm" },
    { name: "Oshodi Market", specialty: "Livestock & Poultry", days: "Daily", hours: "7am–7pm" },
    { name: "Mushin Agric Market", specialty: "General Agric", days: "Mon–Sat", hours: "8am–6pm" },
    { name: "Ikorodu Agric Hub", specialty: "Crops & Inputs", days: "Wed & Sat", hours: "7am–5pm" },
  ],
  Kano: [
    { name: "Dawanau Grain Market", specialty: "Grains & Pulses", days: "Mon–Sat", hours: "7am–6pm" },
    { name: "Rimi Cattle Market", specialty: "Livestock", days: "Tue & Fri", hours: "8am–4pm" },
    { name: "Yankaba Produce Market", specialty: "Fresh Produce", days: "Daily", hours: "6am–8pm" },
    { name: "Kurmi Market", specialty: "General Trade", days: "Daily", hours: "8am–7pm" },
  ],
  Abuja: [
    { name: "Wuse Market", specialty: "Fresh Produce & Grains", days: "Daily", hours: "6am–7pm" },
    { name: "Karu Agric Market", specialty: "Crops & Livestock", days: "Mon–Sat", hours: "7am–5pm" },
    { name: "Gwagwalada Produce Market", specialty: "Root Crops", days: "Tue & Sat", hours: "6am–4pm" },
    { name: "Nyanya Market", specialty: "General Agric", days: "Daily", hours: "7am–7pm" },
  ],
  Oyo: [
    { name: "Bodija Market", specialty: "Grains & Cassava", days: "Daily", hours: "6am–8pm" },
    { name: "Oje Market", specialty: "General Trade", days: "Daily", hours: "8am–6pm" },
    { name: "Ojoo Agric Hub", specialty: "Fresh Produce", days: "Mon–Sat", hours: "7am–6pm" },
    { name: "Eruwa Farmers Market", specialty: "Root Crops", days: "Thu & Sun", hours: "7am–4pm" },
  ],
  Rivers: [
    { name: "Mile 3 Market", specialty: "Fish & Produce", days: "Daily", hours: "5am–8pm" },
    { name: "Rumuola Agric Market", specialty: "General Agric", days: "Mon–Sat", hours: "7am–6pm" },
    { name: "Obio Market", specialty: "Fresh Produce", days: "Daily", hours: "6am–7pm" },
    { name: "Choba Farmers Hub", specialty: "Grains & Pulses", days: "Wed & Sat", hours: "7am–5pm" },
  ],
};

async function seedPricesIfEmpty() {
  const existing = await db.select({ id: marketPricesTable.id }).from(marketPricesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(marketPricesTable).values(SEED_PRICES);
  }
}

router.get("/prices", async (req, res) => {
  try {
    await seedPricesIfEmpty();
    const prices = await db.select().from(marketPricesTable);
    res.json(prices.map((p) => ({
      id: p.id, commodity: p.commodity, pricePerKg: p.pricePerKg, unit: p.unit,
      market: p.market, state: p.state, trend: p.trend, changePercent: p.changePercent,
      updatedAt: p.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get market prices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nearby", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [farmer] = await db.select({ state: farmersTable.state, lga: farmersTable.lga }).from(farmersTable).where(eq(farmersTable.id, farmerId)).limit(1);
    const state = farmer?.state || "";
    const markets = NEARBY_MARKETS[state] ?? NEARBY_MARKETS.default;
    const now = new Date();
    const hour = now.getHours();
    res.json(markets.map((m, i) => ({
      id: i + 1,
      name: m.name,
      specialty: m.specialty,
      days: m.days,
      hours: m.hours,
      distance: `${(1.5 + i * 1.8).toFixed(1)} km`,
      isOpen: hour >= 7 && hour < 19,
      state: state || "Kano",
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get nearby markets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/analyze", async (req, res) => {
  try {
    await seedPricesIfEmpty();
    const { commodity, action } = req.body as { commodity?: string; action?: string };
    if (!commodity || !action) {
      res.status(400).json({ error: "commodity and action (buy/sell) are required" });
      return;
    }

    const prices = await db.select().from(marketPricesTable);
    const match = prices.find((p) => p.commodity.toLowerCase().includes(commodity.toLowerCase()) || commodity.toLowerCase().includes(p.commodity.toLowerCase().split(" ")[0]));

    if (!match) {
      res.json({
        commodity,
        action,
        currentPrice: null,
        recommendation: "hold",
        reasoning: `We don't have current price data for ${commodity}. Check with your local market before trading.`,
        riskLevel: "medium",
        projectedPriceIn7Days: null,
        projectedPriceIn30Days: null,
        bestTimeWindow: "Unknown — gather local price data first",
        tip: "Consider selling in small batches to average your price over time.",
      });
      return;
    }

    const { pricePerKg, trend, changePercent, unit } = match;
    const change = changePercent ?? 0;
    const projected7 = Math.round(pricePerKg * (1 + (change / 100) * 0.5));
    const projected30 = Math.round(pricePerKg * (1 + (change / 100) * 2));

    let recommendation: string;
    let reasoning: string;
    let riskLevel: string;
    let bestTimeWindow: string;
    let tip: string;

    if (action === "sell") {
      if (trend === "rising" && change > 3) {
        recommendation = "sell now";
        reasoning = `${match.commodity} prices are rising at ${change.toFixed(1)}% and currently at ₦${pricePerKg.toLocaleString()}/${unit}. Strong upward momentum suggests this is a good selling window. Prices may continue rising short-term, but markets can correct suddenly.`;
        riskLevel = "low";
        bestTimeWindow = "Sell within the next 1–2 weeks to capture current gains";
        tip = "Split your stock — sell 60% now to lock in gains, hold 40% for potential further upside.";
      } else if (trend === "falling" && change < -5) {
        recommendation = "sell urgently";
        reasoning = `${match.commodity} prices are falling sharply (${change.toFixed(1)}%). At ₦${pricePerKg.toLocaleString()}/${unit}, selling now prevents further losses. Prices are projected to drop to ₦${projected30.toLocaleString()} within 30 days.`;
        riskLevel = "high";
        bestTimeWindow = "Sell within 3–5 days to minimize losses";
        tip = "Avoid holding perishable stock during a price decline. Sell all you can this week.";
      } else {
        recommendation = "hold or sell gradually";
        reasoning = `${match.commodity} is stable at ₦${pricePerKg.toLocaleString()}/${unit} with ${change > 0 ? "slight upward" : "minimal"} movement (${change.toFixed(1)}%). No urgent pressure to sell. You can sell in batches to average your returns.`;
        riskLevel = "low";
        bestTimeWindow = "Sell over the next 2–4 weeks in batches";
        tip = "Monitor prices twice a week. If trend shifts to rising, accelerate your sales.";
      }
    } else {
      if (trend === "falling" && change < -3) {
        recommendation = "buy now";
        reasoning = `${match.commodity} prices are declining (${change.toFixed(1)}%) and currently at ₦${pricePerKg.toLocaleString()}/${unit}. This is a favorable buying opportunity. Prices may stabilize or recover within 30 days.`;
        riskLevel = "low";
        bestTimeWindow = "Buy within the next 1–2 weeks while prices are low";
        tip = "Buy in bulk if you have storage capacity — you'll save significantly vs. buying later.";
      } else if (trend === "rising" && change > 5) {
        recommendation = "wait if possible";
        reasoning = `${match.commodity} is currently rising at ${change.toFixed(1)}%. Buying now at ₦${pricePerKg.toLocaleString()}/${unit} means higher input costs. If you can delay purchase, wait for a price correction.`;
        riskLevel = "medium";
        bestTimeWindow = "Wait 2–4 weeks for a potential price correction";
        tip = "If the purchase is urgent for planting, buy minimum needed now and more later when prices stabilize.";
      } else {
        recommendation = "buy as needed";
        reasoning = `${match.commodity} is stable at ₦${pricePerKg.toLocaleString()}/${unit}. No significant upward or downward pressure. Buy based on your actual production needs.`;
        riskLevel = "low";
        bestTimeWindow = "Buy any time in the next 2–3 weeks";
        tip = "Bulk buying during stable prices is a good strategy if you have storage.";
      }
    }

    res.json({
      commodity: match.commodity,
      action,
      currentPrice: pricePerKg,
      unit,
      trend,
      changePercent: change,
      recommendation,
      reasoning,
      riskLevel,
      projectedPriceIn7Days: projected7,
      projectedPriceIn30Days: projected30,
      bestTimeWindow,
      tip,
      market: match.market,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze market");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/listings", async (req, res) => {
  try {
    const { type } = req.query;
    const rows = await db
      .select({
        id: marketListingsTable.id, farmerId: marketListingsTable.farmerId, type: marketListingsTable.type,
        title: marketListingsTable.title, description: marketListingsTable.description, priceNgn: marketListingsTable.priceNgn,
        quantity: marketListingsTable.quantity, unit: marketListingsTable.unit, imageUrl: marketListingsTable.imageUrl,
        status: marketListingsTable.status, createdAt: marketListingsTable.createdAt,
        farmerName: farmersTable.name, farmerAvatar: farmersTable.avatarUrl, farmerState: farmersTable.state,
        farmerLga: farmersTable.lga, farmerVerified: farmersTable.verificationStatus,
      })
      .from(marketListingsTable)
      .leftJoin(farmersTable, eq(marketListingsTable.farmerId, farmersTable.id))
      .orderBy(desc(marketListingsTable.createdAt));

    const filtered = type && typeof type === "string" ? rows.filter((r) => r.type === type) : rows;
    res.json(filtered.filter((r) => r.status === "active").map((r) => ({
      id: r.id, farmerId: r.farmerId, farmerName: r.farmerName ?? "—", farmerAvatar: r.farmerAvatar ?? null,
      farmerVerified: r.farmerVerified === "verified", type: r.type, title: r.title, description: r.description,
      priceNgn: r.priceNgn, quantity: r.quantity, unit: r.unit, state: r.farmerState ?? "—",
      lga: r.farmerLga ?? "—", imageUrl: r.imageUrl, status: r.status, createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get market listings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/listings", async (req, res) => {
  try {
    const { type, title, description, priceNgn, quantity, unit, imageUrl } = req.body;
    if (!type || !title || !priceNgn || !quantity || !unit) {
      res.status(400).json({ error: "type, title, priceNgn, quantity, and unit are required" });
      return;
    }
    const [listing] = await db.insert(marketListingsTable).values({ farmerId: req.farmerId!, type, title, description: description || "", priceNgn, quantity, unit, imageUrl }).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, req.farmerId!));
    res.status(201).json({
      id: listing.id, farmerId: listing.farmerId, farmerName: farmer?.name ?? "—", farmerAvatar: farmer?.avatarUrl ?? null,
      farmerVerified: farmer?.verificationStatus === "verified", type: listing.type, title: listing.title,
      description: listing.description, priceNgn: listing.priceNgn, quantity: listing.quantity, unit: listing.unit,
      state: farmer?.state ?? "—", lga: farmer?.lga ?? "—", imageUrl: listing.imageUrl,
      status: listing.status, createdAt: listing.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/listings/:listingId", async (req, res) => {
  try {
    const [row] = await db
      .select({
        id: marketListingsTable.id, farmerId: marketListingsTable.farmerId, type: marketListingsTable.type,
        title: marketListingsTable.title, description: marketListingsTable.description, priceNgn: marketListingsTable.priceNgn,
        quantity: marketListingsTable.quantity, unit: marketListingsTable.unit, imageUrl: marketListingsTable.imageUrl,
        status: marketListingsTable.status, createdAt: marketListingsTable.createdAt,
        farmerName: farmersTable.name, farmerAvatar: farmersTable.avatarUrl, farmerState: farmersTable.state,
        farmerLga: farmersTable.lga, farmerVerified: farmersTable.verificationStatus,
      })
      .from(marketListingsTable)
      .leftJoin(farmersTable, eq(marketListingsTable.farmerId, farmersTable.id))
      .where(eq(marketListingsTable.id, Number(req.params.listingId)));
    if (!row) return res.status(404).json({ error: "Listing not found" });
    res.json({
      id: row.id, farmerId: row.farmerId, farmerName: row.farmerName ?? "—", farmerAvatar: row.farmerAvatar ?? null,
      farmerVerified: row.farmerVerified === "verified", type: row.type, title: row.title, description: row.description,
      priceNgn: row.priceNgn, quantity: row.quantity, unit: row.unit, state: row.farmerState ?? "—",
      lga: row.farmerLga ?? "—", imageUrl: row.imageUrl, status: row.status, createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/listings/:listingId", async (req, res) => {
  try {
    const [existing] = await db.select({ farmerId: marketListingsTable.farmerId }).from(marketListingsTable).where(eq(marketListingsTable.id, Number(req.params.listingId)));
    if (!existing || existing.farmerId !== req.farmerId!) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    await db.delete(marketListingsTable).where(eq(marketListingsTable.id, Number(req.params.listingId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    await seedPricesIfEmpty();
    const allPrices = await db.select().from(marketPricesTable);
    res.json({
      totalListings: allPrices.length,
      activeListings: allPrices.length,
      trendingCommodities: [...new Set(allPrices.filter(p => p.trend === "rising").map((l) => l.commodity))].slice(0, 5),
      priceAlerts: allPrices.filter(p => Math.abs(p.changePercent ?? 0) > 5).map(p => `${p.commodity} ${p.trend === "rising" ? "up" : "down"} ${Math.abs(p.changePercent ?? 0).toFixed(1)}% — ₦${p.pricePerKg}/${p.unit}`).slice(0, 3),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get market summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
