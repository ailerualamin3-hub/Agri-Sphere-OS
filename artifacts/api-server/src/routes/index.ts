import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/farmer", farmerRouter);
router.use("/dashboard", dashboardRouter);
router.use("/climate", climateRouter);
router.use("/farmgpt", farmgptRouter);
router.use("/farms", farmsRouter);
router.use("/crops", cropsRouter);
router.use("/livestock", livestockRouter);
router.use("/market", marketRouter);
router.use("/farmconnect", farmconnectRouter);
router.use("/neuroscore", neuroscoreRouter);
router.use("/opportunities", opportunitiesRouter);
router.use("/season-planner", seasonPlannerRouter);

export default router;
