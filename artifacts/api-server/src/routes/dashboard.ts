import { Router } from "express";
import { db, cropsTable, livestockTable, farmsTable, farmersTable, scanResultsTable, marketPricesTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";

const router = Router();

const STATE_COORDS: Record<string, [number, number]> = {
  Kano: [12.0022, 8.592], Kaduna: [10.5105, 7.4165], Katsina: [12.9889, 7.6006],
  Sokoto: [13.0059, 5.2476], Zamfara: [12.1704, 6.6634], Kebbi: [12.4539, 4.1975],
  Niger: [9.6139, 6.5568], Borno: [11.8333, 13.15], Yobe: [12.0, 11.5],
  Adamawa: [9.3265, 12.3984], Gombe: [10.2897, 11.1673], Bauchi: [10.3158, 9.8442],
  Plateau: [9.2182, 9.5179], Taraba: [7.9986, 10.7744], Nasarawa: [8.5399, 8.3199],
  FCT: [9.0765, 7.3986], Abuja: [9.0765, 7.3986], Kwara: [8.4966, 4.5426],
  Oyo: [7.3775, 3.947], Osun: [7.7827, 4.5624], Ogun: [6.998, 3.4737],
  Lagos: [6.5244, 3.3792], Ondo: [7.1, 4.8417], Edo: [6.335, 5.6037],
  Delta: [5.8904, 5.6804], Anambra: [6.2104, 6.9623], Enugu: [6.4584, 7.5464],
  Imo: [5.4836, 7.035], Abia: [5.4527, 7.5248], Ebonyi: [6.2649, 8.0137],
  "Cross River": [5.8702, 8.5988], "Akwa Ibom": [5.0071, 7.8499],
  Rivers: [4.8156, 7.0498], Bayelsa: [4.7719, 6.0699], Benue: [7.3369, 8.7404],
  Ekiti: [7.719, 5.311], Jigawa: [12.228, 9.5616],
};

const WMO_CODE: Record<number, string> = {
  0: "Sunny", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  80: "Rain Showers", 81: "Rain Showers", 82: "Heavy Showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

function codeToCondition(code: number) {
  return WMO_CODE[code] ?? (code <= 3 ? "Clear" : code <= 67 ? "Rain" : "Thunderstorm");
}

const STATE_EMERGENCY: Record<string, any[]> = {
  default: [
    { id: 1, name: "Primary Healthcare Centre", type: "hospital", phone: "0800-CALL-NHIS", distance: 2.4 },
    { id: 2, name: "Nigeria Police Force", type: "police", phone: "199", distance: 3.1 },
    { id: 3, name: "State Veterinary Clinic", type: "veterinary", phone: "0700-VET-LINE", distance: 5.8 },
    { id: 4, name: "Agricultural Development Programme", type: "extension", phone: "0800-ADP-HELP", distance: 4.2 },
  ],
  Kano: [
    { id: 1, name: "Murtala Muhammad Specialist Hospital", type: "hospital", phone: "064-630011", distance: 2.1 },
    { id: 2, name: "Kano State Police Command", type: "police", phone: "064-646190", distance: 1.8 },
    { id: 3, name: "Kano State Veterinary Services", type: "veterinary", phone: "064-642120", distance: 3.5 },
    { id: 4, name: "Kano ADP Extension Office", type: "extension", phone: "064-660100", distance: 4.0 },
  ],
  Lagos: [
    { id: 1, name: "Lagos University Teaching Hospital", type: "hospital", phone: "01-7748901", distance: 3.2 },
    { id: 2, name: "Lagos State Police Command", type: "police", phone: "07055170000", distance: 2.5 },
    { id: 3, name: "Lagos State Veterinary Services", type: "veterinary", phone: "01-8934501", distance: 5.1 },
    { id: 4, name: "Lagos ADP Office, Badagry", type: "extension", phone: "01-7637892", distance: 6.3 },
  ],
  Abuja: [
    { id: 1, name: "National Hospital Abuja", type: "hospital", phone: "09-5238901", distance: 4.1 },
    { id: 2, name: "FCT Police Command", type: "police", phone: "09-6708300", distance: 3.2 },
    { id: 3, name: "FCT Veterinary & Pest Control", type: "veterinary", phone: "09-4611001", distance: 5.6 },
    { id: 4, name: "FCT ADP Extension Services", type: "extension", phone: "09-6708400", distance: 4.8 },
  ],
  Oyo: [
    { id: 1, name: "University College Hospital Ibadan", type: "hospital", phone: "022-241-0088", distance: 2.9 },
    { id: 2, name: "Oyo State Police Command", type: "police", phone: "022-241-3500", distance: 2.3 },
    { id: 3, name: "Oyo State Veterinary Hospital", type: "veterinary", phone: "022-241-1200", distance: 4.4 },
    { id: 4, name: "Oyo ADP Extension Services", type: "extension", phone: "022-241-0500", distance: 5.2 },
  ],
};

async function fetchWeather(state: string) {
  const coords = STATE_COORDS[state] ?? STATE_COORDS["Kano"];
  const [lat, lng] = coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code` +
    `&timezone=Africa%2FLagos`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const c = data.current;
    return {
      temperature: Math.round(c.temperature_2m),
      humidity: Math.round(c.relative_humidity_2m),
      windSpeed: Math.round(c.wind_speed_10m),
      rainProbability: Math.round(c.precipitation_probability ?? 0),
      condition: codeToCondition(c.weather_code),
      location: `${state} State, Nigeria`,
    };
  } catch {
    return null;
  }
}

function generateInsights(
  crops: any[], animals: any[], farms: any[], scans: any[], weather: any | null, prices: any[]
): any[] {
  const insights: any[] = [];

  if (weather) {
    if (weather.rainProbability > 65) {
      insights.push({ id: "w1", title: "Heavy rain expected", message: `Rain probability is ${weather.rainProbability}% in ${weather.location}. Harvest ready crops before rain arrives and check drainage channels.`, priority: "high", category: "weather" });
    } else if (weather.rainProbability > 35) {
      insights.push({ id: "w2", title: "Rain coming — delay fertilizer", message: `Rain likely today (${weather.rainProbability}%). Hold fertilizer application for 24 hours — let rain settle first for better absorption.`, priority: "medium", category: "weather" });
    }
    if (weather.temperature > 36) {
      insights.push({ id: "w3", title: "Heat stress alert", message: `Temperature is ${weather.temperature}°C — mulch your crops to retain soil moisture and consider early morning irrigation.`, priority: "high", category: "weather" });
    }
    if (weather.humidity > 80) {
      insights.push({ id: "w4", title: "High humidity — watch for fungal disease", message: `Humidity at ${weather.humidity}%. Inspect crops for powdery mildew and fungal infections. Increase air circulation if possible.`, priority: "medium", category: "pest" });
    }
  }

  for (const scan of scans.slice(0, 2)) {
    if (scan.severity === "High" || scan.severity === "Critical") {
      insights.push({ id: `s${scan.id}`, title: `${scan.scanType} issue detected: ${scan.diagnosis}`, message: `Your recent scan found ${scan.diagnosis} (${scan.severity} severity). ${scan.recommendations?.[0] ?? "Consult your local extension officer immediately."}`, priority: "urgent", category: "disease" });
    }
  }

  for (const crop of crops.slice(0, 3)) {
    if ((crop.healthScore ?? 100) < 60) {
      insights.push({ id: `c${crop.id}`, title: `${crop.name} needs attention`, message: `Your ${crop.name} health score is ${crop.healthScore ?? "low"}. Check for pests, water stress, or nutrient deficiency this week.`, priority: "high", category: "crop" });
    }
    if (crop.stage === "harvest") {
      const priceMatch = prices.find(p => p.commodity.toLowerCase().includes(crop.name?.toLowerCase() ?? ""));
      const priceNote = priceMatch ? ` Current market price: ₦${priceMatch.pricePerKg?.toLocaleString()}/${priceMatch.unit}.` : "";
      insights.push({ id: `ch${crop.id}`, title: `${crop.name} is ready to harvest`, message: `Your ${crop.name} has reached harvest stage.${priceNote} Plan delivery to market soon.`, priority: "medium", category: "crop" });
    }
  }

  if (insights.length === 0 && farms.length === 0) {
    insights.push({ id: "start1", title: "Set up your farm profile", message: "Add your farms, crops, and livestock to get personalized insights, weather alerts, and market price updates.", priority: "low", category: "onboarding" });
    insights.push({ id: "start2", title: "Try FarmGPT — your AI farming advisor", message: "Ask FarmGPT anything about planting schedules, pest control, fertilizer rates, or livestock management in your local language.", priority: "low", category: "onboarding" });
  }

  if (insights.length < 3 && prices.some(p => (p.changePercent ?? 0) > 5)) {
    const top = prices.filter(p => (p.changePercent ?? 0) > 5).sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0];
    if (top) {
      insights.push({ id: `p${top.id}`, title: `${top.commodity} prices rising ${top.changePercent?.toFixed(1)}%`, message: `${top.commodity} now at ₦${top.pricePerKg?.toLocaleString()}/${top.unit} at ${top.market}. Good time to sell if you have stock ready.`, priority: "medium", category: "market" });
    }
  }

  return insights.slice(0, 5);
}

router.get("/summary", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [farmer] = await db.select({ state: farmersTable.state }).from(farmersTable).where(eq(farmersTable.id, farmerId)).limit(1);
    const state = farmer?.state || "Kano";

    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map(f => f.id);

    const [crops, animals, scans, prices] = await Promise.all([
      farmIds.length > 0 ? db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds)) : Promise.resolve([]),
      farmIds.length > 0 ? db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds)) : Promise.resolve([]),
      db.select().from(scanResultsTable).where(eq(scanResultsTable.farmerId, farmerId)).orderBy(desc(scanResultsTable.createdAt)).limit(3),
      db.select().from(marketPricesTable).limit(20),
    ]);

    const [weather] = await Promise.all([fetchWeather(state)]);

    const cropHealthScore = crops.length > 0 ? Math.round(crops.reduce((s, c) => s + (c.healthScore ?? 80), 0) / crops.length) : null;
    const livestockHealthScore = animals.length > 0 ? Math.round(animals.reduce((s, a) => s + (a.healthScore ?? 80), 0) / animals.length) : null;
    const avgFarmHealth = farms.length > 0 ? Math.round(farms.reduce((s, f) => s + f.healthScore, 0) / farms.length) : 0;

    const aiInsights = generateInsights(crops, animals, farms, scans, weather, prices);

    const weatherForRisks = weather ?? { temperature: 30, humidity: 60, rainProbability: 20 };
    const climateRisks = {
      floodRisk: weatherForRisks.rainProbability > 70 ? "high" : weatherForRisks.rainProbability > 40 ? "moderate" : "low",
      droughtRisk: weatherForRisks.rainProbability < 10 && weatherForRisks.temperature > 35 ? "high" : "low",
      heatRisk: weatherForRisks.temperature > 36 ? "high" : weatherForRisks.temperature > 32 ? "moderate" : "low",
      pestRisk: weatherForRisks.humidity > 70 ? "high" : "moderate",
    };

    res.json({
      weather,
      farmHealth: {
        overallScore: avgFarmHealth,
        cropHealthScore,
        livestockHealthScore,
        soilHealthScore: farms.length > 0 ? Math.round(avgFarmHealth * 0.9) : null,
        cropHealthStatus: cropHealthScore !== null ? (cropHealthScore >= 75 ? "good" : cropHealthScore >= 50 ? "fair" : "poor") : null,
        livestockHealthStatus: livestockHealthScore !== null ? (livestockHealthScore >= 75 ? "good" : livestockHealthScore >= 50 ? "fair" : "poor") : null,
        activeFarms: farms.length,
        activeCrops: crops.length,
        activeAnimals: animals.length,
      },
      aiInsights,
      climateRisks,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai-insights", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [farmer] = await db.select({ state: farmersTable.state }).from(farmersTable).where(eq(farmersTable.id, farmerId)).limit(1);
    const state = farmer?.state || "Kano";
    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map(f => f.id);
    const [crops, animals, scans, prices] = await Promise.all([
      farmIds.length > 0 ? db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds)) : Promise.resolve([]),
      farmIds.length > 0 ? db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds)) : Promise.resolve([]),
      db.select().from(scanResultsTable).where(eq(scanResultsTable.farmerId, farmerId)).orderBy(desc(scanResultsTable.createdAt)).limit(3),
      db.select().from(marketPricesTable).limit(20),
    ]);
    const weather = await fetchWeather(state);
    res.json(generateInsights(crops, animals, farms, scans, weather, prices));
  } catch (err) {
    req.log.error({ err }, "Failed to get ai insights");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/emergency-contacts", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [farmer] = await db.select({ state: farmersTable.state }).from(farmersTable).where(eq(farmersTable.id, farmerId)).limit(1);
    const state = farmer?.state || "";
    const contacts = STATE_EMERGENCY[state] ?? STATE_EMERGENCY.default;
    res.json(contacts);
  } catch (err) {
    req.log.error({ err }, "Failed to get emergency contacts");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
