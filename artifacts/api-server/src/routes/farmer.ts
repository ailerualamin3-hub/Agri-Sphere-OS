import { Router } from "express";
import { db, farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

router.get("/profile", async (req, res) => {
  try {
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID));
    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    res.json({
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      email: farmer.email,
      avatarUrl: farmer.avatarUrl,
      state: farmer.state,
      lga: farmer.lga,
      farmingType: farmer.farmingType,
      verificationStatus: farmer.verificationStatus,
      neuroScore: farmer.neuroScore,
      communityReputation: farmer.communityReputation,
      credits: farmer.credits,
      joinedAt: farmer.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get farmer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile", async (req, res) => {
  try {
    const { name, email, state, lga, farmingType } = req.body;
    const [updated] = await db
      .update(farmersTable)
      .set({ name, email, state, lga, farmingType })
      .where(eq(farmersTable.id, CURRENT_FARMER_ID))
      .returning();
    res.json({
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      state: updated.state,
      lga: updated.lga,
      farmingType: updated.farmingType,
      verificationStatus: updated.verificationStatus,
      neuroScore: updated.neuroScore,
      communityReputation: updated.communityReputation,
      credits: updated.credits,
      joinedAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update farmer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
