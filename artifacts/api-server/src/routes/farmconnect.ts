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
import { eq, count } from "drizzle-orm";

const router = Router();

const CURRENT_FARMER_ID = 1;

const nearbyFarmers = [
  { id: 2, name: "Ibrahim Musa", avatarUrl: null, farmType: "crop", state: "Kano", lga: "Gezawa", neuroScore: 68, communityReputation: "Silver", verificationStatus: "verified", distanceKm: 3.2 },
  { id: 3, name: "Fatima Aliyu", avatarUrl: null, farmType: "mixed", state: "Kano", lga: "Dala", neuroScore: 81, communityReputation: "Gold", verificationStatus: "verified", distanceKm: 5.7 },
  { id: 4, name: "Yusuf Garba", avatarUrl: null, farmType: "livestock", state: "Kano", lga: "Tofa", neuroScore: 55, communityReputation: "Bronze", verificationStatus: "pending", distanceKm: 8.4 },
  { id: 5, name: "Aisha Sule", avatarUrl: null, farmType: "crop", state: "Kano", lga: "Ungogo", neuroScore: 92, communityReputation: "Platinum", verificationStatus: "verified", distanceKm: 12.1 },
  { id: 6, name: "Musa Abdullahi", avatarUrl: null, farmType: "mixed", state: "Kano", lga: "Kumbotso", neuroScore: 74, communityReputation: "Gold", verificationStatus: "verified", distanceKm: 18.6 },
];

router.get("/feed", async (req, res) => {
  try {
    const posts = await db.select().from(communityPostsTable).orderBy(communityPostsTable.createdAt);
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json(posts.map((p) => ({
      id: p.id,
      authorId: p.authorId,
      authorName: farmer?.name ?? "Aminu Kano",
      authorAvatar: farmer?.avatarUrl ?? null,
      authorVerified: true,
      authorReputation: farmer?.communityReputation ?? "Gold",
      content: p.content,
      imageUrl: p.imageUrl,
      likes: p.likes,
      comments: p.comments,
      tags: [],
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get feed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const [post] = await db.insert(communityPostsTable).values({ authorId: CURRENT_FARMER_ID, content, imageUrl }).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.status(201).json({
      id: post.id,
      authorId: post.authorId,
      authorName: farmer?.name ?? "Aminu Kano",
      authorAvatar: null,
      authorVerified: true,
      authorReputation: farmer?.communityReputation ?? "Gold",
      content: post.content,
      imageUrl: post.imageUrl,
      likes: 0,
      comments: 0,
      tags: [],
      createdAt: post.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create post");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts/:postId/like", async (req, res) => {
  try {
    const [post] = await db.select().from(communityPostsTable).where(eq(communityPostsTable.id, Number(req.params.postId)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    const [updated] = await db.update(communityPostsTable).set({ likes: post.likes + 1 }).where(eq(communityPostsTable.id, post.id)).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json({
      id: updated.id,
      authorId: updated.authorId,
      authorName: farmer?.name ?? "Aminu Kano",
      authorAvatar: null,
      authorVerified: true,
      authorReputation: farmer?.communityReputation ?? "Gold",
      content: updated.content,
      imageUrl: updated.imageUrl,
      likes: updated.likes,
      comments: updated.comments,
      tags: [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to like post");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nearby-farmers", async (req, res) => {
  const radius = Number(req.query.radiusKm ?? 50);
  res.json(nearbyFarmers.filter((f) => f.distanceKm <= radius));
});

router.get("/groups", async (req, res) => {
  try {
    const groups = await db.select().from(farmerGroupsTable);
    res.json(groups.map((g) => ({
      id: g.id, name: g.name, type: g.type, category: g.category,
      description: g.description, memberCount: g.memberCount, imageUrl: g.imageUrl,
      createdAt: g.createdAt.toISOString(),
    })));
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
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json(items.map((i) => ({
      id: i.id, requesterId: i.requesterId, requesterName: farmer?.name ?? "Aminu Kano",
      requesterAvatar: null, requesterReputation: farmer?.communityReputation ?? "Gold",
      title: i.title, description: i.description, activityType: i.activityType,
      location: i.location, dateNeeded: i.dateNeeded, workersNeeded: i.workersNeeded,
      creditsOffered: i.creditsOffered, status: i.status, createdAt: i.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get labour exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/labour-exchange", async (req, res) => {
  try {
    const { title, description, activityType, location, dateNeeded, workersNeeded, creditsOffered } = req.body;
    const [item] = await db.insert(labourExchangeTable).values({ requesterId: CURRENT_FARMER_ID, title, description, activityType, location, dateNeeded, workersNeeded, creditsOffered }).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.status(201).json({ id: item.id, requesterId: item.requesterId, requesterName: farmer?.name ?? "Aminu Kano", requesterAvatar: null, requesterReputation: farmer?.communityReputation ?? "Gold", title: item.title, description: item.description, activityType: item.activityType, location: item.location, dateNeeded: item.dateNeeded, workersNeeded: item.workersNeeded, creditsOffered: item.creditsOffered, status: item.status, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create labour exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/equipment-exchange", async (req, res) => {
  try {
    const items = await db.select().from(equipmentExchangeTable);
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json(items.map((i) => ({ id: i.id, ownerId: i.ownerId, ownerName: farmer?.name ?? "Aminu Kano", ownerAvatar: null, ownerReputation: farmer?.communityReputation ?? "Gold", equipmentType: i.equipmentType, name: i.name, description: i.description, pricePerDayNgn: i.pricePerDayNgn, depositNgn: i.depositNgn, location: i.location, availableFrom: i.availableFrom, availableTo: i.availableTo, imageUrl: i.imageUrl, status: i.status, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get equipment exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/equipment-exchange", async (req, res) => {
  try {
    const { equipmentType, name, description, pricePerDayNgn, depositNgn, location, availableFrom, availableTo, imageUrl } = req.body;
    const [item] = await db.insert(equipmentExchangeTable).values({ ownerId: CURRENT_FARMER_ID, equipmentType, name, description, pricePerDayNgn, depositNgn, location, availableFrom, availableTo, imageUrl }).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.status(201).json({ id: item.id, ownerId: item.ownerId, ownerName: farmer?.name ?? "Aminu Kano", ownerAvatar: null, ownerReputation: farmer?.communityReputation ?? "Gold", equipmentType: item.equipmentType, name: item.name, description: item.description, pricePerDayNgn: item.pricePerDayNgn, depositNgn: item.depositNgn, location: item.location, availableFrom: item.availableFrom, availableTo: item.availableTo, imageUrl: item.imageUrl, status: item.status, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create equipment exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/seed-exchange", async (req, res) => {
  try {
    const items = await db.select().from(seedExchangeTable);
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json(items.map((i) => ({ id: i.id, sellerId: i.sellerId, sellerName: farmer?.name ?? "Aminu Kano", sellerAvatar: null, sellerReputation: farmer?.communityReputation ?? "Gold", cropType: i.cropType, variety: i.variety, listingType: i.listingType, quantityKg: i.quantityKg, priceNgn: i.priceNgn, location: i.location, imageUrl: i.imageUrl, status: i.status, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get seed exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/seed-exchange", async (req, res) => {
  try {
    const { cropType, variety, listingType, quantityKg, priceNgn, location, imageUrl } = req.body;
    const [item] = await db.insert(seedExchangeTable).values({ sellerId: CURRENT_FARMER_ID, cropType, variety, listingType, quantityKg, priceNgn, location, imageUrl }).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.status(201).json({ id: item.id, sellerId: item.sellerId, sellerName: farmer?.name ?? "Aminu Kano", sellerAvatar: null, sellerReputation: farmer?.communityReputation ?? "Gold", cropType: item.cropType, variety: item.variety, listingType: item.listingType, quantityKg: item.quantityKg, priceNgn: item.priceNgn, location: item.location, imageUrl: item.imageUrl, status: item.status, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create seed exchange");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events", async (req, res) => {
  try {
    const events = await db.select().from(communityEventsTable);
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json(events.map((e) => ({ id: e.id, organizerId: e.organizerId, organizerName: farmer?.name ?? "Aminu Kano", title: e.title, description: e.description, eventType: e.eventType, location: e.location, eventDate: e.eventDate, rsvpCount: e.rsvpCount, maxAttendees: e.maxAttendees, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events", async (req, res) => {
  try {
    const { title, description, eventType, location, eventDate, maxAttendees } = req.body;
    const [event] = await db.insert(communityEventsTable).values({ organizerId: CURRENT_FARMER_ID, title, description, eventType, location, eventDate, maxAttendees }).returning();
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.status(201).json({ id: event.id, organizerId: event.organizerId, organizerName: farmer?.name ?? "Aminu Kano", title: event.title, description: event.description, eventType: event.eventType, location: event.location, eventDate: event.eventDate, rsvpCount: event.rsvpCount, maxAttendees: event.maxAttendees, createdAt: event.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create event");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/community-summary", async (req, res) => {
  try {
    const [postCount] = await db.select({ count: count() }).from(communityPostsTable);
    const [labourCount] = await db.select({ count: count() }).from(labourExchangeTable);
    const [equipCount] = await db.select({ count: count() }).from(equipmentExchangeTable);
    const [seedCount] = await db.select({ count: count() }).from(seedExchangeTable);
    const [eventCount] = await db.select({ count: count() }).from(communityEventsTable);
    const farmer = await db.select().from(farmersTable).where(eq(farmersTable.id, CURRENT_FARMER_ID)).then((r) => r[0]);
    res.json({
      totalMembers: 1247,
      activePosts: postCount.count,
      labourRequestsOpen: labourCount.count,
      equipmentAvailable: equipCount.count,
      seedsAvailable: seedCount.count,
      upcomingEvents: eventCount.count,
      myCredits: farmer?.credits ?? 150,
      myReputation: farmer?.communityReputation ?? "Gold",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get community summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
