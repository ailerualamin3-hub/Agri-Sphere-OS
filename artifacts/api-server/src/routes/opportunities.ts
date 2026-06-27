import { Router } from "express";
import { db, farmersTable, governmentOpportunitiesTable, scanResultsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

// Real Nigerian government & NGO agricultural programs
const REAL_PROGRAMS = [
  // FREE (first 5 available to all users)
  {
    title: "CBN Anchor Borrowers' Programme (ABP)",
    description:
      "The Central Bank of Nigeria's flagship agricultural lending programme provides inputs (seeds, fertiliser, chemicals) and cash loans to smallholder farmers growing rice, maize, wheat, cotton, cassava, poultry, fish, and livestock. Repayment is through commodity harvest.",
    opportunityType: "loan",
    providerType: "government",
    provider: "Central Bank of Nigeria (CBN)",
    amountDescription: "Up to ₦300,000 per farmer (inputs + cash)",
    requirements: [
      "Must be a registered smallholder farmer",
      "Join or form a cooperative/cluster of at least 5 farmers",
      "Have a minimum of 1 hectare of farmland",
      "Valid NIN (National Identification Number)",
      "BVN-linked bank account",
      "Register with your state's Agricultural Development Programme (ADP)",
    ],
    benefits: [
      "Subsidised farm inputs (seeds, fertiliser, chemicals)",
      "Cash component for labour and other costs",
      "Access to extension services and training",
      "Market linkage to off-takers after harvest",
      "No collateral required for registered farmers",
    ],
    applicationUrl: "https://www.cbn.gov.ng/devfin/ABP.asp",
    contactEmail: "anchorborrowersprogramme@cbn.gov.ng",
    contactPhone: null,
    targetStates: ["All 36 States", "FCT Abuja"],
    deadline: new Date("2025-12-31"),
    isFeatured: true,
  },
  {
    title: "FMARD Presidential Fertiliser Initiative (PFI)",
    description:
      "The Federal Ministry of Agriculture and Rural Development distributes blended NPK fertiliser at subsidised prices to smallholder farmers across Nigeria. The initiative partners with state governments to ensure fertiliser reaches actual farmers at LGA level.",
    opportunityType: "subsidy",
    providerType: "government",
    provider: "Federal Ministry of Agriculture (FMARD)",
    amountDescription: "Subsidised fertiliser — ₦5,000–₦8,000 per 50kg bag",
    requirements: [
      "Registered farmer with State ADP or FMARD portal",
      "Valid NIN",
      "Present at designated state distribution points",
      "Limit of 2 bags per farmer per season",
    ],
    benefits: [
      "NPK 20:10:10 blended fertiliser at below-market prices",
      "Urea fertiliser available at subsidised rate",
      "Distribution at LGA level — no long travel required",
      "Improved soil fertility and crop yield",
    ],
    applicationUrl: "https://www.fmard.gov.ng",
    contactEmail: "info@fmard.gov.ng",
    contactPhone: null,
    targetStates: ["All 36 States", "FCT"],
    deadline: new Date("2025-11-30"),
    isFeatured: true,
  },
  {
    title: "NIRSAL Agric SME Loan (NASL)",
    description:
      "Nigeria Incentive-Based Risk Sharing System for Agricultural Lending (NIRSAL) provides credit guarantees and direct loans to agricultural SMEs and smallholder farmer cooperatives at a low 9% interest rate.",
    opportunityType: "loan",
    providerType: "government",
    provider: "NIRSAL / CBN",
    amountDescription: "₦100,000 – ₦10 million at 9% interest rate",
    requirements: [
      "Registered business or cooperative (CAC certificate)",
      "Farm ownership or lease documentation",
      "Business plan or farm management plan",
      "BVN and valid NIN",
      "Guarantor (for loans above ₦500,000)",
      "6-month bank statement",
    ],
    benefits: [
      "Low 9% interest rate (vs 25–30% market rate)",
      "Up to 24-month repayment tenure",
      "Grace period during growing season",
      "Insurance cover for crops and livestock",
      "Free technical assistance from NIRSAL team",
    ],
    applicationUrl: "https://www.nirsal.com",
    contactEmail: "info@nirsal.com",
    contactPhone: null,
    targetStates: ["All States"],
    deadline: new Date("2025-12-31"),
    isFeatured: false,
  },
  {
    title: "USAID Feed the Future — Nigeria",
    description:
      "USAID's Feed the Future initiative improves food security and agricultural income in northern Nigeria, providing training, inputs, market linkages, and grants to smallholder farmers growing maize, sorghum, cowpea, and vegetables.",
    opportunityType: "grant",
    providerType: "ngo",
    provider: "USAID Nigeria",
    amountDescription: "Grants, inputs & training (value: ₦50,000–₦500,000)",
    requirements: [
      "Smallholder farmer in targeted states",
      "Primarily in Kano, Kebbi, Sokoto, Kaduna, Benue, Taraba, Niger states",
      "Participate in a farmer group or cooperative",
      "Attend mandatory training sessions",
    ],
    benefits: [
      "Improved seeds and agrochemicals",
      "Training in good agricultural practices (GAP)",
      "Post-harvest loss reduction equipment",
      "Market linkage to processors and buyers",
    ],
    applicationUrl: "https://www.usaid.gov/nigeria/agriculture",
    contactEmail: "nigeria@feedthefuture.gov",
    contactPhone: null,
    targetStates: ["Kano", "Kebbi", "Sokoto", "Kaduna", "Benue", "Taraba", "Niger"],
    deadline: new Date("2025-09-30"),
    isFeatured: false,
  },
  {
    title: "GIZ Nigeria — Agricultural Training Programme",
    description:
      "German Development Cooperation (GIZ) runs the SEDIN and Rural Women Economic Empowerment programmes, providing free vocational and business training plus starter kits to rural farmers.",
    opportunityType: "training",
    providerType: "ngo",
    provider: "GIZ Nigeria / German Government",
    amountDescription: "Free training + starter kits worth ₦30,000–₦80,000",
    requirements: [
      "Rural farmer or agribusiness operator",
      "Priority: women and youth (18–40 years)",
      "Located in programme states",
      "Commitment to complete 3-week training",
    ],
    benefits: [
      "Free farm business management training",
      "Agronomy and post-harvest handling skills",
      "Starter kits (tools, seeds, packaging materials)",
      "Business plan development support",
    ],
    applicationUrl: "https://www.giz.de/en/worldwide/326.html",
    contactEmail: "giz-nigeria@giz.de",
    contactPhone: null,
    targetStates: ["Kano", "Lagos", "Rivers", "Adamawa", "Cross River"],
    deadline: new Date("2025-10-31"),
    isFeatured: false,
  },
  // PRO-only (locked for free users)
  {
    title: "YouWin Agric — Youth in Agribusiness Grant",
    description:
      "The Federal Government's YouWin Agric programme provides non-repayable business plan grants to young Nigerians (18–40) starting or expanding agricultural businesses. Winners receive cash and mentorship.",
    opportunityType: "grant",
    providerType: "government",
    provider: "Federal Ministry of Finance / FME",
    amountDescription: "₦500,000 – ₦10 million cash grant (non-refundable)",
    requirements: [
      "Nigerian citizen aged 18–40 years",
      "Business plan for an agricultural venture",
      "Secondary school certificate minimum",
      "Not a civil servant",
      "Pass the business plan competition evaluation",
    ],
    benefits: [
      "Cash grant — no repayment required",
      "Business mentoring from experienced entrepreneurs",
      "Training in financial management",
      "Networking with investors and market actors",
    ],
    applicationUrl: "https://www.youwin.gov.ng",
    contactEmail: "info@youwin.gov.ng",
    contactPhone: null,
    targetStates: ["All 36 States", "FCT"],
    deadline: new Date("2025-08-31"),
    isFeatured: false,
  },
  {
    title: "NAFDAC Smallholder Product Registration",
    description:
      "NAFDAC's Small-Scale Producer scheme lets smallholder farmers register processed agricultural products (palm oil, garri, groundnut oil) for legal sale in supermarkets and export. Pro access includes a step-by-step application guide.",
    opportunityType: "other",
    providerType: "government",
    provider: "NAFDAC",
    amountDescription: "Product registration from ₦8,000",
    requirements: [
      "Farmer or processor with a packaged product",
      "Production site must be inspectable",
      "Basic hygiene and food safety conditions met",
      "Valid NIN",
    ],
    benefits: [
      "NAFDAC-certified product — can sell in supermarkets & export",
      "Access to federal government procurement programmes",
      "Legal protection against product seizure",
      "Technical guidance on food safety standards",
    ],
    applicationUrl: "https://www.nafdac.gov.ng/registration-of-food-products/",
    contactEmail: "info@nafdac.gov.ng",
    contactPhone: null,
    targetStates: ["All States"],
    deadline: null,
    isFeatured: false,
  },
  {
    title: "Oxfam Nigeria — She Feeds the World Programme",
    description:
      "Oxfam Nigeria supports women smallholder farmers with inputs, climate-smart training, and market access. It targets food-insecure states and partners with local cooperatives to deliver support directly to farming households.",
    opportunityType: "grant",
    providerType: "ngo",
    provider: "Oxfam Nigeria",
    amountDescription: "In-kind support worth ₦40,000–₦100,000 per farmer",
    requirements: [
      "Women smallholder farmers (primary target)",
      "Located in programme LGAs",
      "Member of a women's cooperative or group",
      "Farming at least 0.5 hectare",
    ],
    benefits: [
      "Improved seeds for vegetables and grains",
      "Training in climate-smart agriculture",
      "Financial literacy and savings group support",
      "Market linkages to fair-trade buyers",
    ],
    applicationUrl: "https://www.oxfam.org/en/countries/nigeria",
    contactEmail: "nigeria@oxfam.org",
    contactPhone: null,
    targetStates: ["Borno", "Adamawa", "Yobe", "Sokoto", "Kebbi", "Katsina"],
    deadline: new Date("2025-07-31"),
    isFeatured: false,
  },
];

// Number of programs free users can see fully (rest are locked)
const FREE_PROGRAM_LIMIT = 5;

async function seedOpportunities() {
  try {
    const [{ c }] = await db
      .select({ c: count() })
      .from(governmentOpportunitiesTable);
    if (Number(c) > 0) return;

    for (const prog of REAL_PROGRAMS) {
      await db.insert(governmentOpportunitiesTable).values({
        title: prog.title,
        description: prog.description,
        opportunityType: prog.opportunityType as any,
        providerType: prog.providerType as any,
        provider: prog.provider,
        amountDescription: prog.amountDescription,
        requirements: prog.requirements,
        benefits: prog.benefits,
        applicationUrl: prog.applicationUrl ?? null,
        contactEmail: prog.contactEmail ?? null,
        contactPhone: null,
        targetStates: prog.targetStates,
        deadline: prog.deadline ?? null,
        isFeatured: prog.isFeatured,
        isActive: true,
        viewCount: 0,
      });
    }
    console.log("[seed] Seeded", REAL_PROGRAMS.length, "real Nigerian government/NGO programs");
  } catch (e) {
    console.error("[seed] Error seeding opportunities:", e);
  }
}

seedOpportunities();

router.get("/", async (req, res) => {
  try {
    const [farmer] = await db
      .select({ credits: farmersTable.credits })
      .from(farmersTable)
      .where(eq(farmersTable.id, req.farmerId!))
      .limit(1);
    const isPro = (farmer?.credits ?? 0) > 0;

    const opportunities = await db
      .select()
      .from(governmentOpportunitiesTable)
      .where(eq(governmentOpportunitiesTable.isActive, true))
      .orderBy(desc(governmentOpportunitiesTable.isFeatured), desc(governmentOpportunitiesTable.createdAt));

    // Free users see the first FREE_PROGRAM_LIMIT fully; rest are locked
    res.json(
      opportunities.map((o: any, i: number) => ({
        ...o,
        locked: !isPro && i >= FREE_PROGRAM_LIMIT,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [opportunity] = await db
      .select()
      .from(governmentOpportunitiesTable)
      .where(eq(governmentOpportunitiesTable.id, id));
    if (!opportunity) return res.status(404).json({ error: "Opportunity not found" });
    await db
      .update(governmentOpportunitiesTable)
      .set({ viewCount: opportunity.viewCount + 1 })
      .where(eq(governmentOpportunitiesTable.id, id));
    return res.json(opportunity);
  } catch (err) {
    req.log.error({ err }, "Failed to get opportunity");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/scans/history", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const scans = await db
      .select()
      .from(scanResultsTable)
      .where(eq(scanResultsTable.farmerId, farmerId))
      .orderBy(desc(scanResultsTable.createdAt));
    res.json(scans);
  } catch (err) {
    req.log.error({ err }, "Failed to get scan history");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/scans", async (req, res) => {
  try {
    const farmerId = req.farmerId!;
    const { scanType, imageUrl, diagnosis, confidence, severity, description, recommendations } = req.body;
    const [result] = await db
      .insert(scanResultsTable)
      .values({
        farmerId,
        scanType,
        imageUrl: imageUrl ?? null,
        diagnosis,
        confidence,
        severity,
        description,
        recommendations: recommendations ?? [],
      })
      .returning();
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to save scan result");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
