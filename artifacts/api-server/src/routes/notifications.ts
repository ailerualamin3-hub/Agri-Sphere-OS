import { Router } from "express";
import { db, notificationsTable, farmersTable, farmsTable, cropsTable, livestockTable } from "@workspace/db";
import { eq, inArray, and, desc } from "drizzle-orm";
import { sendSms, sendReminderSms } from "../lib/notifications.js";

const router = Router();

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

// Get upcoming livestock vaccination reminders
router.get("/reminders", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const farms = await db.select({ id: farmsTable.id }).from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map((f) => f.id);
    if (farmIds.length === 0) return res.json({ reminders: [] });

    const animals = await db
      .select()
      .from(livestockTable)
      .where(inArray(livestockTable.farmId, farmIds))
      .orderBy(livestockTable.nextVaccinationDate);

    const today = new Date();
    const reminders = animals.map((a) => {
      const vacDate = a.nextVaccinationDate ? new Date(a.nextVaccinationDate) : null;
      const daysUntil = vacDate
        ? Math.ceil((vacDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: a.id,
        farmId: a.farmId,
        species: a.species,
        breed: a.breed,
        count: a.count,
        healthStatus: a.healthStatus,
        healthScore: a.healthScore,
        lastVaccinationDate: a.lastVaccinationDate,
        nextVaccinationDate: a.nextVaccinationDate,
        notes: a.notes,
        daysUntilVaccination: daysUntil,
        urgency: daysUntil === null ? "none" : daysUntil < 0 ? "overdue" : daysUntil === 0 ? "today" : daysUntil <= 3 ? "urgent" : daysUntil <= 7 ? "soon" : "ok",
      };
    });

    res.json({ reminders });
  } catch (err) {
    req.log.error({ err }, "Failed to get reminders");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send SMS reminder for a specific livestock animal
router.post("/reminders/:livestockId/send-sms", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const livestockId = Number(req.params.livestockId);

    const [farmer] = await db
      .select({ phone: farmersTable.phone, name: farmersTable.name })
      .from(farmersTable)
      .where(eq(farmersTable.id, farmerId))
      .limit(1);

    if (!farmer?.phone) {
      return res.status(400).json({ error: "No phone number on your account. Update your profile to receive SMS." });
    }

    const [animal] = await db
      .select()
      .from(livestockTable)
      .where(eq(livestockTable.id, livestockId))
      .limit(1);

    if (!animal) return res.status(404).json({ error: "Animal not found" });

    const dateStr = animal.nextVaccinationDate
      ? new Date(animal.nextVaccinationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "No date set";

    const message = `Vaccination reminder: Your ${animal.count} ${animal.species}${animal.breed ? ` (${animal.breed})` : ""} is due for vaccination on ${dateStr}. Please contact your vet to schedule.`;

    const sent = await sendReminderSms(farmer.phone, `${animal.species} Vaccination Due`, message);

    // Save notification record
    await db.insert(notificationsTable).values({
      farmerId,
      title: `Vaccination Reminder: ${animal.species}`,
      message,
      type: "warning",
      category: "livestock",
      priority: "medium",
      smsSent: sent,
    });

    res.json({ sent, message: sent ? "SMS sent to your phone!" : "Reminder saved (SMS not configured — add TERMII_API_KEY to enable SMS)" });
  } catch (err) {
    req.log.error({ err }, "Failed to send reminder SMS");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update livestock vaccination dates
router.patch("/reminders/:livestockId", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const livestockId = Number(req.params.livestockId);
    const { nextVaccinationDate, lastVaccinationDate, notes } = req.body;

    // Verify animal belongs to farmer's farm
    const farms = await db.select({ id: farmsTable.id }).from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
    const farmIds = farms.map((f) => f.id);
    const [animal] = await db.select().from(livestockTable).where(eq(livestockTable.id, livestockId)).limit(1);
    if (!animal || !farmIds.includes(animal.farmId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [updated] = await db
      .update(livestockTable)
      .set({
        ...(nextVaccinationDate !== undefined ? { nextVaccinationDate } : {}),
        ...(lastVaccinationDate !== undefined ? { lastVaccinationDate } : {}),
        ...(notes !== undefined ? { notes } : {}),
      })
      .where(eq(livestockTable.id, livestockId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update reminder");
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
    const alerts: Array<{ title: string; message: string; type: string; category: string; priority: string }> = [];

    for (const crop of crops) {
      if (crop.healthScore < 50) {
        alerts.push({ title: `Critical: ${crop.name} Health`, message: `Your ${crop.name} health score is critically low at ${crop.healthScore}%. Immediate attention required.`, type: "alert", category: "crop", priority: "high" });
      } else if (crop.healthScore < 70) {
        alerts.push({ title: `Warning: ${crop.name} Health`, message: `${crop.name} health score dropped to ${crop.healthScore}%. Check for pests or irrigation issues.`, type: "warning", category: "crop", priority: "medium" });
      }
      if (crop.expectedHarvestDate) {
        const harvestDate = new Date(crop.expectedHarvestDate);
        const daysUntil = Math.ceil((harvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          alerts.push({ title: `Harvest Ready: ${crop.name}`, message: `Your ${crop.name} is due for harvest in ${daysUntil === 0 ? "today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}. Prepare your equipment.`, type: "info", category: "crop", priority: daysUntil <= 2 ? "high" : "medium" });
        }
      }
    }

    for (const animal of animals) {
      if (animal.healthScore < 50 || animal.healthStatus === "sick" || animal.healthStatus === "critical") {
        alerts.push({ title: `Sick ${animal.species} Detected`, message: `${animal.count} ${animal.species} showing health score of ${animal.healthScore}%. Contact your vet immediately.`, type: "alert", category: "livestock", priority: "high" });
      }
      if (animal.nextVaccinationDate) {
        const vacDate = new Date(animal.nextVaccinationDate);
        const daysUntil = Math.ceil((vacDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          alerts.push({ title: `Vaccination Due: ${animal.species}`, message: `Vaccination for ${animal.count} ${animal.species} is due in ${daysUntil === 0 ? "today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}.`, type: "warning", category: "livestock", priority: daysUntil <= 2 ? "high" : "medium" });
        }
      }
    }

    for (const farm of farms) {
      if (farm.healthScore < 50) {
        alerts.push({ title: `Farm Health Critical: ${farm.name}`, message: `${farm.name} health score is at ${farm.healthScore}%. Soil or structural issues may need attention.`, type: "alert", category: "farm", priority: "high" });
      }
    }

    if (alerts.length === 0) {
      alerts.push({ title: "All Systems Healthy", message: "Your farm is in good condition. Keep up the great work!", type: "info", category: "general", priority: "low" });
    }

    const inserted = await db
      .insert(notificationsTable)
      .values(alerts.map((a) => ({ ...a, farmerId })))
      .returning();

    const highPriority = inserted.filter((n) => n.priority === "high");
    const smsSentIds: number[] = [];

    if (farmer?.phone && highPriority.length > 0) {
      for (const notif of highPriority) {
        const sent = await sendSms(farmer.phone, `FREGE AI Alert\n${notif.title}: ${notif.message}`);
        if (sent) smsSentIds.push(notif.id);
      }
      if (smsSentIds.length > 0) {
        await db.update(notificationsTable).set({ smsSent: true }).where(inArray(notificationsTable.id, smsSentIds));
      }
    }

    res.json({ generated: inserted.length, smsSent: smsSentIds.length });
  } catch (err) {
    req.log.error({ err }, "Failed to generate notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
