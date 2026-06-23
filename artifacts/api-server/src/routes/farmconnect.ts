import { Router } from "express";
import {
  db,
  communityPostsTable,
  farmerGroupsTable,
  labourExchangeTable,
  equipmentExchangeTable,
  seedExchangeTable,
  communityEventsTable,
  farmersTable,
} from "@workspace/db";
import { eq, ne, count } from "drizzle-orm";

const router = Router();

router.get("/feed", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const posts = await db.select().from(communityPostsTable).orderBy(communityPostsTable.createdAt);
    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const authorsMap: Record<number, { name: string; avatarUrl: string | null; communityReputation: string; verificationStatus: string }> = {};
    for (const id of authorIds) {
      const [f] = await db.select({ name: farmersTable.name, avatarUrl: farmersTable.avatarUrl, communityReputation: farmersTable.communityReputation, verificationStatus: farmersTable.verificationStatus }).from(farmersTable).where(eq(farmersTable.id, id));
      if (f) authorsMap[id] = f;
    }
    res.json(posts.map((p) => ({
      id: p.id,
      authorId: p.authorId,
      authorName: authorsMap[p.authorId]?.name ?? "—",
      authorAvatar: authorsMap[p.authorId]?.avatarUrl ?? null,
      authorVerified: authorsMap[p.authorId]?.verificationStatus === "verified",
      authorReputation: authorsMap[p.authorId]?.communityReputation ?? "Bronze",
      content: p.content,
      imageUrl: p.imageUrl,
      likes: p.likes,
      comments: p.comments,
      tags: [],
      isOwn: p.authorId === farmerId,
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get feed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { content, imageUrl } = req.body;
    const [post] = await db.insert(communityPostsTable).values({ authorId: farmerId, content, imageUrl }).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId));
    res.status(201).json({
      id: post.id,
      authorId: post.authorId,
      authorName: farmer?.name ?? "—",
      authorAvatar: farmer?.avatarUrl ?? null,
      authorVerified: farmer?.verificationStatus === "verified",
      authorReputation: farmer?.communityReputation ?? "Bronze",
      content: post.content,
      imageUrl: post.imageUrl,
      likes: 0,
      comments: 0,
      tags: [],
      isOwn: true,
      createdAt: post.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create post");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:postId/like", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [post] = await db.select().from(communityPostsTable).where(eq(communityPostsTable.id, Number(req.params.postId)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    const [updated] = await db.update(communityPostsTable).set({ likes: post.likes + 1 }).where(eq(communityPostsTable.id, post.id)).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, updated.authorId));
    res.json({
      id: updated.id,
      authorId: updated.authorId,
      authorName: farmer?.name ?? "—",
      authorAvatar: farmer?.avatarUrl ?? null,
      authorVerified: farmer?.verificationStatus === "verified",
      authorReputation: farmer?.communityReputation ?? "Bronze",
      content: updated.content,
      imageUrl: updated.imageUrl,
      likes: updated.likes,
      comments: updated.comments,
      tags: [],
      isOwn: updated.authorId === farmerId,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to like post");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nearby-farmers", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const farmers = await db
      .select({
        id: farmersTable.id,
        name: farmersTable.name,
        avatarUrl: farmersTable.avatarUrl,
        farmingType: farmersTable.farmingType,
        state: farmersTable.state,
        lga: farmersTable.lga,
        neuroScore: farmersTable.neuroScore,
        communityReputation: farmersTable.communityReputation,
        verificationStatus: farmersTable.verificationStatus,
      })
      .from(farmersTable)
      .where(ne(farmersTable.id, farmerId))
      .limit(20);

    res.json(farmers.map((f) => ({
      id: f.id,
      name: f.name,
      avatarUrl: f.avatarUrl,
      farmType: f.farmingType,
      state: f.state,
      lga: f.lga,
      neuroScore: f.neuroScore,
      communityReputation: f.communityReputation,
      verificationStatus: f.verificationStatus,
      distanceKm: null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get nearby farmers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/groups", async (req, res) => {
  try {
    const groups = await db.select().from(farmerGroupsTable);
    res.json(groups.map((g) => ({ id: g.id, name: g.name, type: g.type, category: g.category, description: g.description, memberCount: g.memberCount, imageUrl: g.imageUrl, createdAt: g.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get groups");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/groups", async (req, res) => {
  try {
    const { name, type, category, description } = req.body;
    const [group] = await db.insert(farmerGroupsTable).values({ name, type, category, description }).returning();
    res.status(201).json({ id: group.id, name: group.name, type: group.type, category: group.category, description: group.description, memberCount: group.memberCount, imageUrl: group.imageUrl, createdAt: group.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create group");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/labour-exchange", async (req, res) => {
  try {
    const items = await db.select().from(labourExchangeTable);
    const authorIds = [...new Set(items.map((i) => i.requesterId))];
    const authorsMap: Record<number, { name: string; communityReputation: string }> = {};
    for (const id of authorIds) {
      const [f] = await db.select({ name: farmersTable.name, communityReputation: farmersTable.communityReputation }).from(farmersTable).where(eq(farmersTable.id, id));
      if (f) authorsMap[id] = f;
    }
    res.json(items.map((i) => ({ id: i.id, requesterId: i.requesterId, requesterName: authorsMap[i.requesterId]?.name ?? "—", requesterAvatar: null, requesterReputation: authorsMap[i.requesterId]?.communityReputation ?? "Bronze", title: i.title, description: i.description, activityType: i.activityType, location: i.location, dateNeeded: i.dateNeeded, workersNeeded: i.workersNeeded, creditsOffered: i.creditsOffered, status: i.status, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get labour exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/labour-exchange", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { title, description, activityType, location, dateNeeded, workersNeeded, creditsOffered } = req.body;
    const [item] = await db.insert(labourExchangeTable).values({ requesterId: farmerId, title, description, activityType, location, dateNeeded, workersNeeded, creditsOffered }).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId));
    res.status(201).json({ id: item.id, requesterId: item.requesterId, requesterName: farmer?.name ?? "—", requesterAvatar: null, requesterReputation: farmer?.communityReputation ?? "Bronze", title: item.title, description: item.description, activityType: item.activityType, location: item.location, dateNeeded: item.dateNeeded, workersNeeded: item.workersNeeded, creditsOffered: item.creditsOffered, status: item.status, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create labour exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/equipment-exchange", async (req, res) => {
  try {
    const items = await db.select().from(equipmentExchangeTable);
    const ownerIds = [...new Set(items.map((i) => i.ownerId))];
    const ownersMap: Record<number, { name: string; communityReputation: string }> = {};
    for (const id of ownerIds) {
      const [f] = await db.select({ name: farmersTable.name, communityReputation: farmersTable.communityReputation }).from(farmersTable).where(eq(farmersTable.id, id));
      if (f) ownersMap[id] = f;
    }
    res.json(items.map((i) => ({ id: i.id, ownerId: i.ownerId, ownerName: ownersMap[i.ownerId]?.name ?? "—", ownerAvatar: null, ownerReputation: ownersMap[i.ownerId]?.communityReputation ?? "Bronze", equipmentType: i.equipmentType, name: i.name, description: i.description, pricePerDayNgn: i.pricePerDayNgn, depositNgn: i.depositNgn, location: i.location, availableFrom: i.availableFrom, availableTo: i.availableTo, imageUrl: i.imageUrl, status: i.status, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get equipment exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/equipment-exchange", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { equipmentType, name, description, pricePerDayNgn, depositNgn, location, availableFrom, availableTo, imageUrl } = req.body;
    const [item] = await db.insert(equipmentExchangeTable).values({ ownerId: farmerId, equipmentType, name, description, pricePerDayNgn, depositNgn, location, availableFrom, availableTo, imageUrl }).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId));
    res.status(201).json({ id: item.id, ownerId: item.ownerId, ownerName: farmer?.name ?? "—", ownerAvatar: null, ownerReputation: farmer?.communityReputation ?? "Bronze", equipmentType: item.equipmentType, name: item.name, description: item.description, pricePerDayNgn: item.pricePerDayNgn, depositNgn: item.depositNgn, location: item.location, availableFrom: item.availableFrom, availableTo: item.availableTo, imageUrl: item.imageUrl, status: item.status, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create equipment exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/seed-exchange", async (req, res) => {
  try {
    const items = await db.select().from(seedExchangeTable);
    const sellerIds = [...new Set(items.map((i) => i.sellerId))];
    const sellersMap: Record<number, { name: string; communityReputation: string }> = {};
    for (const id of sellerIds) {
      const [f] = await db.select({ name: farmersTable.name, communityReputation: farmersTable.communityReputation }).from(farmersTable).where(eq(farmersTable.id, id));
      if (f) sellersMap[id] = f;
    }
    res.json(items.map((i) => ({ id: i.id, sellerId: i.sellerId, sellerName: sellersMap[i.sellerId]?.name ?? "—", sellerAvatar: null, sellerReputation: sellersMap[i.sellerId]?.communityReputation ?? "Bronze", cropType: i.cropType, variety: i.variety, listingType: i.listingType, quantityKg: i.quantityKg, priceNgn: i.priceNgn, location: i.location, imageUrl: i.imageUrl, status: i.status, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get seed exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/seed-exchange", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { cropType, variety, listingType, quantityKg, priceNgn, location, imageUrl } = req.body;
    const [item] = await db.insert(seedExchangeTable).values({ sellerId: farmerId, cropType, variety, listingType, quantityKg, priceNgn, location, imageUrl }).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId));
    res.status(201).json({ id: item.id, sellerId: item.sellerId, sellerName: farmer?.name ?? "—", sellerAvatar: null, sellerReputation: farmer?.communityReputation ?? "Bronze", cropType: item.cropType, variety: item.variety, listingType: item.listingType, quantityKg: item.quantityKg, priceNgn: item.priceNgn, location: item.location, imageUrl: item.imageUrl, status: item.status, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create seed exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events", async (req, res) => {
  try {
    const events = await db.select().from(communityEventsTable);
    const organizerIds = [...new Set(events.map((e) => e.organizerId))];
    const organizersMap: Record<number, { name: string }> = {};
    for (const id of organizerIds) {
      const [f] = await db.select({ name: farmersTable.name }).from(farmersTable).where(eq(farmersTable.id, id));
      if (f) organizersMap[id] = f;
    }
    res.json(events.map((e) => ({ id: e.id, organizerId: e.organizerId, organizerName: organizersMap[e.organizerId]?.name ?? "—", title: e.title, description: e.description, eventType: e.eventType, location: e.location, eventDate: e.eventDate, rsvpCount: e.rsvpCount, maxAttendees: e.maxAttendees, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { title, description, eventType, location, eventDate, maxAttendees } = req.body;
    const [event] = await db.insert(communityEventsTable).values({ organizerId: farmerId, title, description, eventType, location, eventDate, maxAttendees }).returning();
    const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.id, farmerId));
    res.status(201).json({ id: event.id, organizerId: event.organizerId, organizerName: farmer?.name ?? "—", title: event.title, description: event.description, eventType: event.eventType, location: event.location, eventDate: event.eventDate, rsvpCount: event.rsvpCount, maxAttendees: event.maxAttendees, createdAt: event.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/community-summary", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const [postCount] = await db.select({ count: count() }).from(communityPostsTable);
    const [labourCount] = await db.select({ count: count() }).from(labourExchangeTable);
    const [equipCount] = await db.select({ count: count() }).from(equipmentExchangeTable);
    const [seedCount] = await db.select({ count: count() }).from(seedExchangeTable);
    const [eventCount] = await db.select({ count: count() }).from(communityEventsTable);
    const [totalFarmers] = await db.select({ count: count() }).from(farmersTable);
    const [farmer] = await db.select({ credits: farmersTable.credits, communityReputation: farmersTable.communityReputation }).from(farmersTable).where(eq(farmersTable.id, farmerId));
    res.json({
      totalMembers: totalFarmers.count,
      activePosts: postCount.count,
      labourRequestsOpen: labourCount.count,
      equipmentAvailable: equipCount.count,
      seedsAvailable: seedCount.count,
      upcomingEvents: eventCount.count,
      myCredits: farmer?.credits ?? 0,
      myReputation: farmer?.communityReputation ?? "Bronze",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get community summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
