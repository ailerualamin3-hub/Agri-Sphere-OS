import { Router } from "express";
import { db, farmersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function farmerToJson(farmer: typeof farmersTable.$inferSelect) {
  return {
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
    onboardingComplete: farmer.onboardingComplete,
    joinedAt: farmer.createdAt.toISOString(),
  };
}

router.get("/profile", async (req, res) => {
  try {
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, req.farmerId!));
    if (!farmer) {
      res.status(404).json({ error: "Farmer not found" });
      return;
    }
    res.json(farmerToJson(farmer));
  } catch (err) {
    req.log.error({ err }, "Failed to get farmer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile", async (req, res) => {
  try {
    const { name, email, state, lga, farmingType, onboardingComplete } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (state !== undefined) updateData.state = state;
    if (lga !== undefined) updateData.lga = lga;
    if (farmingType !== undefined) updateData.farmingType = farmingType;
    if (onboardingComplete !== undefined) updateData.onboardingComplete = onboardingComplete;

    const [updated] = await db
      .update(farmersTable)
      .set(updateData)
      .where(eq(farmersTable.id, req.farmerId!))
      .returning();

    res.json(farmerToJson(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update farmer profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
