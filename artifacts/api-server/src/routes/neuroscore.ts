import { Router } from "express";
import { db, farmersTable, farmsTable, cropsTable, livestockTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

router.get("/", async (req, res) => {
  try {
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID));
    const allFarms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, CURRENT_FARMER_ID));
    const allCrops = await db.select().from(cropsTable);
    const allAnimals = await db.select().from(livestockTable);

    res.json({
      score: farmer?.neuroScore ?? 72.5,
      level: "Advanced",
      change30Days: +5.2,
      farmPassport: {
        farmerId: CURRENT_FARMER_ID,
        farmerName: farmer?.name ?? "Aminu Kano",
        verificationStatus: farmer?.verificationStatus ?? "verified",
        totalFarms: allFarms.length,
        totalHectares: allFarms.reduce((s, f) => s + f.sizeHectares, 0),
        yearsOfFarming: 8,
        primaryCrops: [...new Set(allCrops.map((c) => c.name))].slice(0, 3),
        primaryLivestock: [...new Set(allAnimals.map((a) => a.species))].slice(0, 3),
        totalYieldKg: 12500,
        totalTransactions: 34,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get NeuroScore");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/breakdown", async (req, res) => {
  res.json({
    cropPerformance: 78,
    livestockPerformance: 82,
    communityReputation: 85,
    farmActivity: 70,
    marketplaceActivity: 65,
    farmRecords: 68,
    total: 72.5,
  });
});

router.get("/readiness", async (req, res) => {
  res.json({
    loanReadiness: {
      score: 68,
      level: "almost_ready",
      requirements: ["Maintain farm records for 12 months", "Complete identity verification", "Add 2 more market transactions"],
      tips: ["Link your bank account to FregeOS", "Upload land ownership documents", "Build 3 more months of consistent farm activity"],
    },
    investorReadiness: {
      score: 45,
      level: "developing",
      requirements: ["Achieve NeuroScore above 80", "Complete 6 months of market transactions", "Obtain at least Silver community reputation"],
      tips: ["Participate more in FarmConnect groups", "List more produce on AgriMarket", "Complete FarmGPT business education modules"],
    },
    insuranceReadiness: {
      score: 82,
      level: "ready",
      requirements: ["Farm registration complete", "3+ months of weather-correlated records"],
      tips: ["You qualify for basic crop insurance", "Apply for livestock coverage with your vaccination records"],
    },
    ngoReadiness: {
      score: 74,
      level: "almost_ready",
      requirements: ["Complete farmer profile", "Join a community group", "Maintain regular farm activity"],
      tips: ["Join a crop-based group in FarmConnect", "Participate in at least one community event", "Share your farming experience in the community feed"],
    },
  });
});

export default router;
