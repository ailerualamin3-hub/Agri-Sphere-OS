import { Router } from "express";
import { db, marketPricesTable, marketListingsTable, farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

router.get("/prices", async (req, res) => {
  try {
    const prices = await db.select().from(marketPricesTable);
    res.json(prices.map((p) => ({
      id: p.id,
      commodity: p.commodity,
      pricePerKg: p.pricePerKg,
      unit: p.unit,
      market: p.market,
      state: p.state,
      trend: p.trend,
      changePercent: p.changePercent,
      updatedAt: p.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get market prices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/listings", async (req, res) => {
  try {
    const { type } = req.query;
    let query = db.select().from(marketListingsTable).$dynamic();
    if (type && typeof type === "string") {
      query = query.where(eq(marketListingsTable.type, type));
    }
    const listings = await query;
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json(listings.map((l) => ({
      id: l.id,
      farmerId: l.farmerId,
      farmerName: farmer?.name ?? "Aminu Kano",
      farmerAvatar: farmer?.avatarUrl ?? null,
      farmerVerified: true,
      type: l.type,
      title: l.title,
      description: l.description,
      priceNgn: l.priceNgn,
      quantity: l.quantity,
      unit: l.unit,
      state: farmer?.state ?? "Kano",
      lga: farmer?.lga ?? "Kano Municipal",
      imageUrl: l.imageUrl,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get market listings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/listings", async (req, res) => {
  try {
    const { type, title, description, priceNgn, quantity, unit, imageUrl } = req.body;
    const [listing] = await db.insert(marketListingsTable).values({ farmerId: CURRENT_FARMER_ID, type, title, description, priceNgn, quantity, unit, imageUrl }).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.status(201).json({
      id: listing.id,
      farmerId: listing.farmerId,
      farmerName: farmer?.name ?? "Aminu Kano",
      farmerAvatar: farmer?.avatarUrl ?? null,
      farmerVerified: true,
      type: listing.type,
      title: listing.title,
      description: listing.description,
      priceNgn: listing.priceNgn,
      quantity: listing.quantity,
      unit: listing.unit,
      state: farmer?.state ?? "Kano",
      lga: farmer?.lga ?? "Kano Municipal",
      imageUrl: listing.imageUrl,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/listings/:listingId", async (req, res) => {
  try {
    const [listing] = await db.select().from(marketListingsTable).where(eq(marketListingsTable.id, Number(req.params.listingId)));
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json({
      id: listing.id,
      farmerId: listing.farmerId,
      farmerName: farmer?.name ?? "Aminu Kano",
      farmerAvatar: null,
      farmerVerified: true,
      type: listing.type,
      title: listing.title,
      description: listing.description,
      priceNgn: listing.priceNgn,
      quantity: listing.quantity,
      unit: listing.unit,
      state: farmer?.state ?? "Kano",
      lga: farmer?.lga ?? "Kano Municipal",
      imageUrl: listing.imageUrl,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/listings/:listingId", async (req, res) => {
  try {
    await db.delete(marketListingsTable).where(eq(marketListingsTable.id, Number(req.params.listingId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const allListings = await db.select().from(marketListingsTable);
    const activeListings = allListings.filter((l) => l.status === "active");
    res.json({
      totalListings: allListings.length,
      activeListings: activeListings.length,
      trendingCommodities: ["Maize", "Rice", "Tomatoes", "Goats", "Sorghum"],
      priceAlerts: [
        "Rice prices up 8% this week in Kano",
        "Tomato prices falling — sell before further decline",
        "Maize demand increasing from processors",
        "Fertilizer prices stable — good time to stock up",
      ],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get market summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
