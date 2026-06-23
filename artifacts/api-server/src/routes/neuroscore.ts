import { Router } from "express";
import { db, farmersTable, farmsTable, cropsTable, livestockTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId));
    const allFarms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = allFarms.map((f) => f.id);
    const allCrops = farmIds.length > 0
      ? await db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds))
      : [];
    const allAnimals = farmIds.length > 0
      ? await db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds))
      : [];

    const score = farmer?.neuroScore ?? 0;
    const level = score >= 85 ? "Expert" : score >= 70 ? "Advanced" : score >= 50 ? "Intermediate" : "Beginner";

    res.json({
      score,
      level,
      change30Days: 0,
      farmPassport: {
        farmerId,
        farmerName: farmer?.name ?? "—",
        verificationStatus: farmer?.verificationStatus ?? "pending",
        totalFarms: allFarms.length,
        totalHectares: allFarms.reduce((s, f) => s + f.sizeHectares, 0),
        yearsOfFarming: null,
        primaryCrops: [...new Set(allCrops.map((c) => c.name))].slice(0, 3),
        primaryLivestock: [...new Set(allAnimals.map((a) => a.species))].slice(0, 3),
        totalYieldKg: allCrops.reduce((s, c) => s + (c.actualYieldKg ?? 0), 0),
        totalTransactions: 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get NeuroScore");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/breakdown", async (req, res) => {
  const farmerId = req.farmerId!;
  const allFarms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
  const farmIds = allFarms.map((f) => f.id);
  const allCrops = farmIds.length > 0 ? await db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds)) : [];
  const allAnimals = farmIds.length > 0 ? await db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds)) : [];

  const cropPerformance = allCrops.length > 0 ? Math.round(allCrops.reduce((s, c) => s + (c.healthScore ?? 0), 0) / allCrops.length) : 0;
  const livestockPerformance = allAnimals.length > 0 ? Math.round(allAnimals.reduce((s, a) => s + (a.healthScore ?? 0), 0) / allAnimals.length) : 0;
  const farmActivity = allFarms.length > 0 ? Math.min(100, allFarms.length * 20) : 0;

  res.json({
    cropPerformance,
    livestockPerformance,
    communityReputation: 0,
    farmActivity,
    marketplaceActivity: 0,
    farmRecords: allFarms.length > 0 ? 50 : 0,
    total: Math.round((cropPerformance + livestockPerformance + farmActivity) / 3),
  });
});

router.get("/readiness", async (_req, res) => {
  res.json({
    loanReadiness: {
      score: 0,
      level: "developing",
      requirements: ["Maintain farm records for 12 months", "Complete identity verification", "Add market transactions"],
      tips: ["Link your bank account to FregeOS", "Upload land ownership documents", "Build consistent farm activity"],
    },
    investorReadiness: {
      score: 0,
      level: "developing",
      requirements: ["Achieve NeuroScore above 80", "Complete 6 months of market transactions", "Obtain Silver community reputation"],
      tips: ["Participate in FarmConnect groups", "List produce on AgriMarket", "Complete FarmGPT education modules"],
    },
    insuranceReadiness: {
      score: 0,
      level: "developing",
      requirements: ["Farm registration complete", "3+ months of weather-correlated records"],
      tips: ["Register your farms", "Record crop and livestock health regularly"],
    },
    ngoReadiness: {
      score: 0,
      level: "developing",
      requirements: ["Complete farmer profile", "Join a community group", "Maintain regular farm activity"],
      tips: ["Join a crop-based group in FarmConnect", "Participate in community events", "Share your farming experience"],
    },
  });
});

export default router;
