import { Router } from "express";
import { db, cropsTable, livestockTable, farmsTable } from "@workspace/db";
import { count, avg } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const [cropCount] = await db.select({ count: count() }).from(cropsTable);
    const [animalCount] = await db.select({ count: count() }).from(livestockTable);
    const [farmCount] = await db.select({ count: count() }).from(farmsTable);
    const [avgFarmHealth] = await db.select({ avg: avg(farmsTable.healthScore) }).from(farmsTable);

    const crops = await db.select({ healthScore: cropsTable.healthScore }).from(cropsTable);
    const animals = await db.select({ healthScore: livestockTable.healthScore }).from(livestockTable);

    const cropHealthScore = crops.length > 0
      ? Math.round(crops.reduce((sum, c) => sum + (c.healthScore ?? 80), 0) / crops.length)
      : null;
    const livestockHealthScore = animals.length > 0
      ? Math.round(animals.reduce((sum, a) => sum + (a.healthScore ?? 80), 0) / animals.length)
      : null;
    const soilHealthScore = farmCount.count > 0 ? 73 : null;

    res.json({
      weather: {
        temperature: 31,
        humidity: 68,
        windSpeed: 12,
        rainProbability: 35,
        condition: "Partly Cloudy",
        location: "Kano State, Nigeria",
      },
      farmHealth: {
        overallScore: Math.round(Number(avgFarmHealth.avg ?? 0)),
        cropHealthScore,
        livestockHealthScore,
        soilHealthScore,
        cropHealthStatus: cropHealthScore !== null ? (cropHealthScore >= 75 ? "good" : cropHealthScore >= 50 ? "fair" : "poor") : "good",
        livestockHealthStatus: livestockHealthScore !== null ? (livestockHealthScore >= 75 ? "good" : livestockHealthScore >= 50 ? "fair" : "poor") : "good",
        activeFarms: farmCount.count,
        activeCrops: cropCount.count,
        activeAnimals: animalCount.count,
      },
      aiInsights: [
        { id: 1, type: "weather", title: "Rain Expected Tomorrow", message: "Moderate rainfall expected tomorrow afternoon. Delay fertilizer application by 2 days.", priority: "high", createdAt: new Date().toISOString() },
        { id: 2, type: "disease", title: "Maize Disease Risk Increasing", message: "Northern blight risk elevated in your area. Monitor leaves for gray lesions.", priority: "urgent", createdAt: new Date().toISOString() },
        { id: 3, type: "livestock", title: "Goat Vaccination Due in 3 Days", message: "Schedule PPR vaccination for your goat herd. Contact your nearest vet.", priority: "medium", createdAt: new Date().toISOString() },
        { id: 4, type: "market", title: "Rice Price Increasing", message: "Rice market prices up 8% this week in Kano. Good time to sell surplus.", priority: "medium", createdAt: new Date().toISOString() },
        { id: 5, type: "soil", title: "Soil Moisture Optimal", message: "Current soil moisture levels are ideal for your maize crop at flowering stage.", priority: "low", createdAt: new Date().toISOString() },
      ],
      climateRisks: {
        floodRisk: "low",
        droughtRisk: "moderate",
        heatRisk: "moderate",
        pestRisk: "high",
        recommendation: "Increase irrigation frequency and apply preventive pest control this week.",
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai-insights", async (req, res) => {
  res.json([
    { id: 1, type: "weather", title: "Rain Expected Tomorrow", message: "Moderate rainfall expected tomorrow afternoon. Delay fertilizer application by 2 days.", priority: "high", createdAt: new Date().toISOString() },
    { id: 2, type: "disease", title: "Maize Disease Risk Increasing", message: "Northern blight risk elevated in your area. Monitor leaves for gray lesions.", priority: "urgent", createdAt: new Date().toISOString() },
    { id: 3, type: "livestock", title: "Goat Vaccination Due in 3 Days", message: "Schedule PPR vaccination for your goat herd. Contact your nearest vet.", priority: "medium", createdAt: new Date().toISOString() },
    { id: 4, type: "market", title: "Rice Price Increasing", message: "Rice market prices up 8% this week in Kano. Good time to sell surplus.", priority: "medium", createdAt: new Date().toISOString() },
    { id: 5, type: "soil", title: "Soil Moisture Optimal", message: "Current soil moisture levels are ideal for your maize crop at flowering stage.", priority: "low", createdAt: new Date().toISOString() },
    { id: 6, type: "general", title: "Planting Calendar Reminder", message: "Optimal sorghum planting window opens in 12 days. Prepare your seed beds now.", priority: "medium", createdAt: new Date().toISOString() },
  ]);
});

router.get("/emergency-contacts", async (req, res) => {
  res.json([
    { id: 1, type: "police", name: "Kano State Police HQ", phone: "0800-POLICE", distance: 2.3, address: "Bompai Road, Kano" },
    { id: 2, type: "hospital", name: "Murtala Muhammad Specialist Hospital", phone: "064-200-201", distance: 3.8, address: "Hospital Road, Kano" },
    { id: 3, type: "veterinary", name: "FAAN Veterinary Clinic", phone: "064-631-500", distance: 5.1, address: "Agric House, Zoo Road, Kano" },
    { id: 4, type: "fire", name: "Kano State Fire Service", phone: "193", distance: 4.2, address: "Kano State Fire Station" },
  ]);
});

export default router;
