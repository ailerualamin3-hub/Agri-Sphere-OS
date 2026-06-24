import { Router } from "express";
import { db, farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const STATE_COORDS: Record<string, [number, number]> = {
  Kano: [12.0022, 8.592],
  Kaduna: [10.5105, 7.4165],
  Katsina: [12.9889, 7.6006],
  Sokoto: [13.0059, 5.2476],
  Zamfara: [12.1704, 6.6634],
  Kebbi: [12.4539, 4.1975],
  Niger: [9.6139, 6.5568],
  Borno: [11.8333, 13.1500],
  Yobe: [12.0000, 11.5000],
  Adamawa: [9.3265, 12.3984],
  Gombe: [10.2897, 11.1673],
  Bauchi: [10.3158, 9.8442],
  Plateau: [9.2182, 9.5179],
  Taraba: [7.9986, 10.7744],
  Nasarawa: [8.5399, 8.3199],
  FCT: [9.0765, 7.3986],
  Abuja: [9.0765, 7.3986],
  Kwara: [8.4966, 4.5426],
  Oyo: [7.3775, 3.9470],
  Osun: [7.7827, 4.5624],
  Ogun: [6.9980, 3.4737],
  Lagos: [6.5244, 3.3792],
  Ondo: [7.1000, 4.8417],
  Edo: [6.3350, 5.6037],
  Delta: [5.8904, 5.6804],
  Anambra: [6.2104, 6.9623],
  Enugu: [6.4584, 7.5464],
  Imo: [5.4836, 7.0350],
  Abia: [5.4527, 7.5248],
  Ebonyi: [6.2649, 8.0137],
  "Cross River": [5.8702, 8.5988],
  "Akwa Ibom": [5.0071, 7.8499],
  Rivers: [4.8156, 7.0498],
  Bayelsa: [4.7719, 6.0699],
  Benue: [7.3369, 8.7404],
  Ekiti: [7.7190, 5.3110],
  Jigawa: [12.2280, 9.5616],
};

const WMO_CODE: Record<number, string> = {
  0: "Sunny",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Heavy Showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

function codeToCondition(code: number): string {
  return WMO_CODE[code] ?? (code <= 3 ? "Clear" : code <= 67 ? "Rain" : "Thunderstorm");
}

function farmingRecommendations(temps: number[], rain: number[], condition: string, state: string): string[] {
  const tips: string[] = [];
  const maxRain = Math.max(...rain);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / (temps.length || 1);

  if (maxRain > 60) {
    tips.push("Heavy rain expected this week — harvest any ready crops before it arrives");
    tips.push("Check your drainage channels to avoid waterlogging on your farm");
  } else if (maxRain > 30) {
    tips.push("Rain is coming — delay fertilizer application until after the rain for best absorption");
    tips.push("Good time to apply pre-emergent herbicide just before the rain");
  } else {
    tips.push("Dry conditions ahead — consider watering your crops if you have irrigation");
  }

  if (avgTemp > 33) {
    tips.push(`High temperatures in ${state} this week — mulch around your crops to retain soil moisture`);
  }
  if (condition.includes("Thunder")) {
    tips.push("Thunderstorm risk — secure lightweight farm structures and harvested produce");
  }
  if (maxRain > 40) {
    tips.push("High humidity raises pest and fungal disease risk — inspect your crops closely this week");
  } else {
    tips.push("Moderate weather is good for field work — ideal time for weeding and scouting for pests");
  }
  return tips.slice(0, 5);
}

router.get("/forecast", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [farmer] = await db
      .select({ state: farmersTable.state })
      .from(farmersTable)
      .where(eq(farmersTable.id, farmerId))
      .limit(1);

    const state = farmer?.state || "Kano";
    const coords = STATE_COORDS[state] ?? STATE_COORDS["Kano"];
    const [lat, lng] = coords;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=Africa%2FLagos&forecast_days=7`;

    let weatherData: any;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`Open-Meteo error: ${resp.status}`);
      weatherData = await resp.json();
    } catch (fetchErr) {
      req.log.warn({ fetchErr }, "Open-Meteo fetch failed, using fallback");
      weatherData = null;
    }

    let current: any;
    let forecast: any[];
    let maxRainProb = 35;

    if (weatherData) {
      const c = weatherData.current;
      const d = weatherData.daily;
      current = {
        temperature: Math.round(c.temperature_2m),
        humidity: Math.round(c.relative_humidity_2m),
        windSpeed: Math.round(c.wind_speed_10m),
        rainProbability: Math.round(c.precipitation_probability ?? 0),
        condition: codeToCondition(c.weather_code),
        location: `${state} State, Nigeria`,
      };
      forecast = (d.time as string[]).map((date: string, i: number) => ({
        date,
        highTemp: Math.round(d.temperature_2m_max[i]),
        lowTemp: Math.round(d.temperature_2m_min[i]),
        condition: codeToCondition(d.weather_code[i]),
        rainProbability: Math.round(d.precipitation_probability_max[i] ?? 0),
      }));
      maxRainProb = Math.max(...forecast.map((f) => f.rainProbability));
    } else {
      current = {
        temperature: 31, humidity: 68, windSpeed: 12,
        rainProbability: 35, condition: "Partly Cloudy",
        location: `${state} State, Nigeria`,
      };
      const today = new Date();
      forecast = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return {
          date: d.toISOString().split("T")[0],
          highTemp: 30 + Math.round(Math.random() * 5),
          lowTemp: 22 + Math.round(Math.random() * 3),
          condition: i === 2 || i === 5 ? "Rain" : "Partly Cloudy",
          rainProbability: i === 2 || i === 5 ? 65 : 20,
        };
      });
    }

    const maxTemps = forecast.map((f) => f.highTemp);
    const rainProbs = forecast.map((f) => f.rainProbability);

    const risks = {
      floodRisk: maxRainProb > 70 ? "high" : maxRainProb > 40 ? "moderate" : "low",
      droughtRisk: current.rainProbability < 10 && current.temperature > 35 ? "high" : "low",
      heatRisk: current.temperature > 36 ? "high" : current.temperature > 32 ? "moderate" : "low",
      pestRisk: current.humidity > 70 ? "high" : "moderate",
    };

    const recommendations = farmingRecommendations(maxTemps, rainProbs, current.condition, state);

    res.json({ current, forecast, risks, recommendations });
  } catch (err) {
    req.log.error({ err }, "Failed to get climate forecast");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
