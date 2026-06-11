import { Router } from "express";

const router = Router();

router.get("/forecast", async (req, res) => {
  res.json({
    current: {
      temperature: 31,
      humidity: 68,
      windSpeed: 12,
      rainProbability: 35,
      condition: "Partly Cloudy",
      location: "Kano State, Nigeria",
    },
    forecast: [
      { date: "2026-06-12", highTemp: 33, lowTemp: 24, condition: "Sunny", rainProbability: 10 },
      { date: "2026-06-13", highTemp: 29, lowTemp: 22, condition: "Rainy", rainProbability: 75 },
      { date: "2026-06-14", highTemp: 28, lowTemp: 21, condition: "Overcast", rainProbability: 55 },
      { date: "2026-06-15", highTemp: 32, lowTemp: 23, condition: "Partly Cloudy", rainProbability: 20 },
      { date: "2026-06-16", highTemp: 34, lowTemp: 25, condition: "Sunny", rainProbability: 5 },
      { date: "2026-06-17", highTemp: 30, lowTemp: 22, condition: "Thunderstorm", rainProbability: 85 },
      { date: "2026-06-18", highTemp: 27, lowTemp: 20, condition: "Light Rain", rainProbability: 60 },
    ],
    risks: {
      floodRisk: "low",
      droughtRisk: "moderate",
      heatRisk: "moderate",
      pestRisk: "high",
      recommendation: "Heavy rains expected June 17-18. Harvest any ready crops before then. Apply pest control this week.",
    },
    recommendations: [
      "Delay fertilizer application until after the rain on June 13",
      "Harvest ripe maize before June 17 thunderstorm",
      "Apply pre-emergent herbicide before June 13 rain for best absorption",
      "Check drainage channels on all farms — flood risk elevated after June 17",
      "Increase pest scouting frequency — high humidity raises armyworm risk",
    ],
  });
});

export default router;
