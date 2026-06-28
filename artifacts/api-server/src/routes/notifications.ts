import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/notifications/send
 * Sends a push notification to the user via Pingram.
 * Body: { type: "lunch" | "dinner", userId: string }
 */
router.post("/send", requireAuth, async (req, res) => {
  const { type } = req.body as { type: "lunch" | "dinner" };
  const userId = req.userId!;
  const apiKey = process.env.PINGRAM_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Pingram API key not configured" });
    return;
  }

  const title = type === "lunch" ? "Lunch Reminder" : "Dinner Reminder";
  const message =
    type === "lunch"
      ? "It's 12:00 PM — don't forget to mark your lunch attendance!"
      : "It's 8:00 PM — don't forget to mark your dinner attendance!";

  try {
    // Send notification via Pingram REST API
    const response = await fetch("https://api.pingram.io/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        type: "meal_reminder",
        to: { id: userId },
        web_push: {
          title,
          message,
          url: "/",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ status: response.status, error: errorText }, "Pingram send failed");
      // Still return 200 to the client — non-critical failure
      res.json({ sent: false, reason: "delivery_failed" });
      return;
    }

    res.json({ sent: true });
  } catch (err) {
    logger.error({ err }, "Failed to send Pingram notification");
    res.json({ sent: false, reason: "error" });
  }
});

export default router;
