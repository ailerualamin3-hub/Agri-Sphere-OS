import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import healthRouter from "./health";
import authRouter from "./auth";
import farmerRouter from "./farmer";
import dashboardRouter from "./dashboard";
import climateRouter from "./climate";
import farmgptRouter from "./farmgpt";
import farmsRouter from "./farms";
import cropsRouter from "./crops";
import livestockRouter from "./livestock";
import marketRouter from "./market";
import farmconnectRouter from "./farmconnect";
import neuroscoreRouter from "./neuroscore";
import opportunitiesRouter from "./opportunities";
import seasonPlannerRouter from "./season-planner";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

// All routes below require a valid JWT
router.use("/farmer", requireAuth, farmerRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/climate", requireAuth, climateRouter);
router.use("/farmgpt", requireAuth, farmgptRouter);
router.use("/farms", requireAuth, farmsRouter);
router.use("/crops", requireAuth, cropsRouter);
router.use("/livestock", requireAuth, livestockRouter);
router.use("/market", requireAuth, marketRouter);
router.use("/farmconnect", requireAuth, farmconnectRouter);
router.use("/neuroscore", requireAuth, neuroscoreRouter);
router.use("/opportunities", requireAuth, opportunitiesRouter);
router.use("/season-planner", requireAuth, seasonPlannerRouter);
router.use("/notifications", requireAuth, notificationsRouter);

export default router;
