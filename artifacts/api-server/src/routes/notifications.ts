import { Router } from "express";
import { db, notificationsTable, farmersTable, farmsTable, cropsTable, livestockTable } from "@workspace/db";
import { eq, inArray, and, desc } from "drizzle-orm";

const router = Router();

async function sendSms(to: string, body: string) {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const fromNumber = process.env["TWILIO_PHONE_NUMBER"];
  if (!accountSid || !authToken || !fromNumber) return false;
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }).toString(),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

router.get("/", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.farmerId, farmerId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    req.log.error({ err }, "Failed to get notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.farmerId, farmerId), eq(notificationsTable.isRead, false)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params["id"]);
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.farmerId, farmerId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const id = Number(req.params["id"]);
    await db
      .delete(notificationsTable)
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.farmerId, farmerId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete notification");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const farmerId = req.farmerId!;

    const [farmer] = await db
      .select({ phone: farmersTable.phone, name: farmersTable.name })
      .from(farmersTable)
      .where(eq(farmersTable.id, farmerId))
      .limit(1);

    const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map((f) => f.id);

    const crops = farmIds.length > 0
      ? await db.select().from(cropsTable).where(inArray(cropsTable.farmId, farmIds))
      : [];

    const animals = farmIds.length > 0
      ? await db.select().from(livestockTable).where(inArray(livestockTable.farmId, farmIds))
      : [];

    const today = new Date();
    const alerts: Array<{
      title: string;
      message: string;
      type: string;
      category: string;
      priority: string;
    }> = [];

    for (const crop of crops) {
      if (crop.healthScore < 50) {
        alerts.push({
          title: `Critical: ${crop.name} Health`,
          message: `Your ${crop.name} crop health score is critically low at ${crop.healthScore}%. Immediate attention required.`,
          type: "alert",
          category: "crop",
          priority: "high",
        });
      } else if (crop.healthScore < 70) {
        alerts.push({
          title: `Warning: ${crop.name} Health`,
          message: `${crop.name} health score has dropped to ${crop.healthScore}%. Check for pests, disease, or irrigation issues.`,
          type: "warning",
          category: "crop",
          priority: "medium",
        });
      }

      if (crop.expectedHarvestDate) {
        const harvestDate = new Date(crop.expectedHarvestDate);
        const daysUntil = Math.ceil((harvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          alerts.push({
            title: `Harvest Ready: ${crop.name}`,
            message: `Your ${crop.name} is due for harvest in ${daysUntil === 0 ? "today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}. Prepare your equipment.`,
            type: "info",
            category: "crop",
            priority: daysUntil <= 2 ? "high" : "medium",
          });
        }
      }
    }

    for (const animal of animals) {
      if (animal.healthScore < 50 || animal.healthStatus === "sick" || animal.healthStatus === "critical") {
        alerts.push({
          title: `Sick ${animal.species} Detected`,
          message: `${animal.count} ${animal.species} showing health score of ${animal.healthScore}%. Contact your vet immediately.`,
          type: "alert",
          category: "livestock",
          priority: "high",
        });
      }

      if (animal.nextVaccinationDate) {
        const vacDate = new Date(animal.nextVaccinationDate);
        const daysUntil = Math.ceil((vacDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          alerts.push({
            title: `Vaccination Due: ${animal.species}`,
            message: `Vaccination for ${animal.count} ${animal.species} is due in ${daysUntil === 0 ? "today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}.`,
            type: "warning",
            category: "livestock",
            priority: "medium",
          });
        }
      }
    }

    for (const farm of farms) {
      if (farm.healthScore < 50) {
        alerts.push({
          title: `Farm Health Critical: ${farm.name}`,
          message: `${farm.name} overall health score is at ${farm.healthScore}%. Soil or structural issues may need attention.`,
          type: "alert",
          category: "farm",
          priority: "high",
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        title: "All Systems Healthy",
        message: "Your farm is in good condition. Keep up the great work!",
        type: "info",
        category: "general",
        priority: "low",
      });
    }

    const inserted = await db
      .insert(notificationsTable)
      .values(alerts.map((a) => ({ ...a, farmerId })))
      .returning();

    const highPriority = inserted.filter((n) => n.priority === "high");
    const smsSentIds: number[] = [];

    if (farmer?.phone && highPriority.length > 0) {
      for (const notif of highPriority) {
        const smsBody = `FREGE AI Alert\n${notif.title}: ${notif.message}`;
        const sent = await sendSms(farmer.phone, smsBody);
        if (sent) smsSentIds.push(notif.id);
      }

      if (smsSentIds.length > 0) {
        await db
          .update(notificationsTable)
          .set({ smsSent: true })
          .where(inArray(notificationsTable.id, smsSentIds));
      }
    }

    res.json({ generated: inserted.length, smsSent: smsSentIds.length });
  } catch (err) {
    req.log.error({ err }, "Failed to generate notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
