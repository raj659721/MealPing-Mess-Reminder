import { Router } from "express";
import { groq } from "../lib/groq";
import { requireAuth } from "../middlewares/auth";

import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router = Router();

async function ensureTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);
  } catch { /* tables may already exist */ }
}

ensureTables();

const SYSTEM_PROMPT = `You are MessBot, a helpful AI assistant built into Mess Manager — a hostel mess (canteen) food & attendance tracking app.
You help users with:
- Tracking daily lunch and dinner attendance
- Understanding monthly meal bills and costs
- Setting up meal reminders and notifications
- Using app features like the calendar, history, analytics
- Answering questions about mess food schedules and rules
Always be friendly, concise, and helpful. Respond in the same language the user writes in (Marathi or English).
Keep replies short and actionable. Use emojis occasionally to be warm.`;

/** GET /api/chat/history — fetch current user's last conversation */
router.get("/history", requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    const conv = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .limit(1);

    if (!conv.length) {
      res.json({ messages: [] });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv[0].id))
      .orderBy(asc(messages.createdAt))
      .limit(50);

    res.json({ conversationId: conv[0].id, messages: msgs });
  } catch {
    res.json({ messages: [] });
  }
});

/** POST /api/chat/message — send message and stream AI reply */
router.post("/message", requireAuth, async (req, res) => {
  if (!groq) {
    res.status(503).json({ error: "Chat AI is not configured. Please set the GROQ_API_KEY secret." });
    return;
  }

  const userId = req.userId!;
  const { message, conversationId } = req.body as {
    message: string;
    conversationId?: number;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let convId = conversationId;
    if (!convId) {
      const [newConv] = await db
        .insert(conversations)
        .values({ userId, title: message.slice(0, 60) })
        .returning();
      convId = newConv.id;
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    await db.insert(messages).values({
      conversationId: convId,
      role: "user",
      content: message,
    });

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    let fullResponse = "";
    const stream = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      max_tokens: 512,
      messages: chatMessages,
      stream: true,
    });

    res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI unavailable";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

/** DELETE /api/chat/history — clear all chat history for current user */
router.delete("/history", requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId));
    for (const c of convs) {
      await db.delete(conversations).where(eq(conversations.id, c.id));
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

export default router;
