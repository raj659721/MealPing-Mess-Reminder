import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { resolveRole } from "../middlewares/requireAdmin";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const email = req.userEmail ?? "";
  const role = resolveRole(userId, email);

  res.json({
    userId,
    email,
    firstName: email.split("@")[0] ?? "",
    lastName: "",
    imageUrl: "",
    role,
  });
});

export default router;
