import { Router, type IRouter } from "express";
import healthRouter from "./health";
import entriesRouter from "./entries";
import summaryRouter from "./summary";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import authRouter from "./auth";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/chat", chatRouter);
router.use("/entries", entriesRouter);
router.use("/summary", summaryRouter);
router.use("/settings", settingsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);

export default router;
