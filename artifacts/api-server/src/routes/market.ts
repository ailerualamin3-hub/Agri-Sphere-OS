import { Router } from "express";
import { db, marketPricesTable, marketListingsTable, farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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
    const rows = await db
      .select({
        id: marketListingsTable.id,
        farmerId: marketListingsTable.farmerId,
        type: marketListingsTable.type,
        title: marketListingsTable.title,
        description: marketListingsTable.description,
        priceNgn: marketListingsTable.priceNgn,
        quantity: marketListingsTable.quantity,
        unit: marketListingsTable.unit,
        imageUrl: marketListingsTable.imageUrl,
        status: marketListingsTable.status,
        createdAt: marketListingsTable.createdAt,
        farmerName: farmersTable.name,
        farmerAvatar: farmersTable.avatarUrl,
        farmerState: farmersTable.state,
        farmerLga: farmersTable.lga,
        farmerVerified: farmersTable.verificationStatus,
      })
      .from(marketListingsTable)
      .leftJoin(farmersTable, eq(marketListingsTable.farmerId, farmersTable.id));

    const filtered = type && typeof type === "string"
      ? rows.filter((r) => r.type === type)
      : rows;

    res.json(filtered.map((r) => ({
      id: r.id,
      farmerId: r.farmerId,
      farmerName: r.farmerName ?? "—",
      farmerAvatar: r.farmerAvatar ?? null,
      farmerVerified: r.farmerVerified === "verified",
      type: r.type,
      title: r.title,
      description: r.description,
      priceNgn: r.priceNgn,
      quantity: r.quantity,
      unit: r.unit,
      state: r.farmerState ?? "—",
      lga: r.farmerLga ?? "—",
      imageUrl: r.imageUrl,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get market listings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/listings", async (req, res) => {
  try {
    const { type, title, description, priceNgn, quantity, unit, imageUrl } = req.body;
    const [listing] = await db
      .insert(marketListingsTable)
      .values({ farmerId: req.farmerId!, type, title, description, priceNgn, quantity, unit, imageUrl })
      .returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, req.farmerId!));
    res.status(201).json({
      id: listing.id,
      farmerId: listing.farmerId,
      farmerName: farmer?.name ?? "—",
      farmerAvatar: farmer?.avatarUrl ?? null,
      farmerVerified: farmer?.verificationStatus === "verified",
      type: listing.type,
      title: listing.title,
      description: listing.description,
      priceNgn: listing.priceNgn,
      quantity: listing.quantity,
      unit: listing.unit,
      state: farmer?.state ?? "—",
      lga: farmer?.lga ?? "—",
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
    const [row] = await db
      .select({
        id: marketListingsTable.id,
        farmerId: marketListingsTable.farmerId,
        type: marketListingsTable.type,
        title: marketListingsTable.title,
        description: marketListingsTable.description,
        priceNgn: marketListingsTable.priceNgn,
        quantity: marketListingsTable.quantity,
        unit: marketListingsTable.unit,
        imageUrl: marketListingsTable.imageUrl,
        status: marketListingsTable.status,
        createdAt: marketListingsTable.createdAt,
        farmerName: farmersTable.name,
        farmerAvatar: farmersTable.avatarUrl,
        farmerState: farmersTable.state,
        farmerLga: farmersTable.lga,
        farmerVerified: farmersTable.verificationStatus,
      })
      .from(marketListingsTable)
      .leftJoin(farmersTable, eq(marketListingsTable.farmerId, farmersTable.id))
      .where(eq(marketListingsTable.id, Number(req.params.listingId)));

    if (!row) return res.status(404).json({ error: "Listing not found" });
    res.json({
      id: row.id,
      farmerId: row.farmerId,
      farmerName: row.farmerName ?? "—",
      farmerAvatar: row.farmerAvatar ?? null,
      farmerVerified: row.farmerVerified === "verified",
      type: row.type,
      title: row.title,
      description: row.description,
      priceNgn: row.priceNgn,
      quantity: row.quantity,
      unit: row.unit,
      state: row.farmerState ?? "—",
      lga: row.farmerLga ?? "—",
      imageUrl: row.imageUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
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
    const allListings = await db.select().from(marketPricesTable);
    res.json({
      totalListings: allListings.length,
      activeListings: allListings.length,
      trendingCommodities: [...new Set(allListings.map((l) => l.commodity))].slice(0, 5),
      priceAlerts: [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get market summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
