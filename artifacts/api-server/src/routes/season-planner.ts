import { Router } from "express";

const router = Router();

const PLANTING_CALENDARS: Record<string, any> = {
  maize: {
    optimalMonths: ["April", "May", "June"],
    germination: "7-10 days",
    maturityDays: 90,
    waterRequirementMm: 500,
    fertilizerSchedule: [
      { weekAfterPlanting: 0, product: "NPK 15-15-15", rateKgPerHa: 150, notes: "Apply at planting in furrow" },
      { weekAfterPlanting: 4, product: "Urea 46%", rateKgPerHa: 100, notes: "Top-dress at 4-leaf stage" },
      { weekAfterPlanting: 8, product: "Urea 46%", rateKgPerHa: 100, notes: "Second top-dress before tasseling" },
    ],
    pestSchedule: [
      { weekAfterPlanting: 1, action: "Monitor for fall armyworm", product: "Emamectin Benzoate", preventive: true },
      { weekAfterPlanting: 3, action: "Stem borer inspection", product: "Carbofuran granules", preventive: false },
      { weekAfterPlanting: 6, action: "Streak virus monitoring", product: "Imidacloprid (aphid control)", preventive: true },
    ],
    harvestIndicators: ["Silks turn brown/black", "Husks dry and tight", "Kernels dent on pressing"],
    estimatedYieldKgPerHa: 2500,
  },
  rice: {
    optimalMonths: ["June", "July"],
    germination: "5-7 days",
    maturityDays: 120,
    waterRequirementMm: 1200,
    fertilizerSchedule: [
      { weekAfterPlanting: 0, product: "NPK 20-10-10", rateKgPerHa: 200, notes: "Basal application before transplanting" },
      { weekAfterPlanting: 3, product: "Urea 46%", rateKgPerHa: 120, notes: "At active tillering" },
      { weekAfterPlanting: 8, product: "Urea 46%", rateKgPerHa: 80, notes: "At panicle initiation" },
    ],
    pestSchedule: [
      { weekAfterPlanting: 2, action: "Monitor for blast disease", product: "Tricyclazole", preventive: true },
      { weekAfterPlanting: 5, action: "Stem borer check", product: "Chlorpyrifos", preventive: false },
      { weekAfterPlanting: 10, action: "Bird scaring during grain fill", product: "Net/scarecrow", preventive: true },
    ],
    harvestIndicators: ["80% of panicles golden yellow", "Grains hard on pressing", "Moisture below 25%"],
    estimatedYieldKgPerHa: 3000,
  },
  sorghum: {
    optimalMonths: ["May", "June", "July"],
    germination: "5-8 days",
    maturityDays: 110,
    waterRequirementMm: 450,
    fertilizerSchedule: [
      { weekAfterPlanting: 0, product: "NPK 15-15-15", rateKgPerHa: 100, notes: "At planting" },
      { weekAfterPlanting: 4, product: "Urea 46%", rateKgPerHa: 80, notes: "At 5-leaf stage" },
    ],
    pestSchedule: [
      { weekAfterPlanting: 1, action: "Monitor shootfly", product: "Carbofuran", preventive: true },
      { weekAfterPlanting: 6, action: "Midge monitoring during flowering", product: "Cypermethrin", preventive: false },
    ],
    harvestIndicators: ["Grain hard on thumbnail", "Stalks dry", "Head turns downward"],
    estimatedYieldKgPerHa: 1800,
  },
  cowpea: {
    optimalMonths: ["May", "June", "July", "August"],
    germination: "4-6 days",
    maturityDays: 65,
    waterRequirementMm: 300,
    fertilizerSchedule: [
      { weekAfterPlanting: 0, product: "Single Super Phosphate", rateKgPerHa: 90, notes: "At planting, minimal N needed" },
      { weekAfterPlanting: 3, product: "Rhizobium inoculant", rateKgPerHa: 0, notes: "Seed treatment before planting" },
    ],
    pestSchedule: [
      { weekAfterPlanting: 2, action: "Aphid and thrips monitoring", product: "Dimethoate", preventive: true },
      { weekAfterPlanting: 5, action: "Pod borer control", product: "Lambda-cyhalothrin", preventive: false },
    ],
    harvestIndicators: ["Pods dry and papery", "Seeds rattle in pod", "Plant leaves yellowing"],
    estimatedYieldKgPerHa: 900,
  },
};

router.post("/generate", async (req, res) => {
  try {
    const { crop, state, farmSizeHectares, plantingMonth } = req.body;

    if (!crop || !farmSizeHectares) {
      return res.status(400).json({ error: "crop and farmSizeHectares are required" });
    }

    const cropKey = crop.toLowerCase().replace(/\s+/g, "");
    const calendar = PLANTING_CALENDARS[cropKey] ?? PLANTING_CALENDARS["maize"];

    const plantingDate = plantingMonth
      ? `${plantingMonth} (recommended)`
      : `${calendar.optimalMonths[0]} – ${calendar.optimalMonths[calendar.optimalMonths.length - 1]}`;

    const harvestYear = new Date().getFullYear();
    const harvestMonth = new Date();
    harvestMonth.setDate(harvestMonth.getDate() + calendar.maturityDays);

    return res.json({
      crop: crop.charAt(0).toUpperCase() + crop.slice(1),
      state: state ?? "Kano",
      farmSizeHectares: Number(farmSizeHectares),
      plantingWindow: plantingDate,
      estimatedHarvestDate: harvestMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      maturityDays: calendar.maturityDays,
      waterRequirementMm: calendar.waterRequirementMm,
      estimatedYieldKg: Math.round(calendar.estimatedYieldKgPerHa * Number(farmSizeHectares)),
      estimatedRevenue: null,
      fertilizerSchedule: calendar.fertilizerSchedule.map((f: any) => ({
        ...f,
        totalKg: Math.round(f.rateKgPerHa * Number(farmSizeHectares)),
      })),
      pestMonitoringSchedule: calendar.pestSchedule,
      harvestIndicators: calendar.harvestIndicators,
      weeklyTimeline: generateWeeklyTimeline(calendar, Number(farmSizeHectares)),
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

function generateWeeklyTimeline(calendar: any, hectares: number) {
  const timeline = [];
  const totalWeeks = Math.ceil(calendar.maturityDays / 7);
  for (let w = 0; w <= totalWeeks; w += 2) {
    const fert = calendar.fertilizerSchedule.find((f: any) => f.weekAfterPlanting === w);
    const pest = calendar.pestSchedule.find((p: any) => p.weekAfterPlanting === w);
    if (fert || pest || w === 0 || w === totalWeeks) {
      timeline.push({
        week: w,
        label: w === 0 ? "Planting Week" : w === totalWeeks ? "Harvest Week" : `Week ${w}`,
        activities: [
          ...(fert ? [`Apply ${fert.product} — ${fert.notes}`] : []),
          ...(pest ? [pest.action] : []),
          ...(w === 0 ? ["Prepare seedbed", "Apply basal fertilizer", "Plant seeds at correct spacing"] : []),
          ...(w === totalWeeks ? ["Check harvest indicators", "Harvest and store properly"] : []),
        ],
      });
    }
  }
  return timeline;
}

export default router;
