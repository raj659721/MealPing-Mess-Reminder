import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "admin@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveRole(userId: string, email: string): "admin" | "user" {
  if (getAdminIds().includes(userId)) return "admin";
  if (getAdminEmails().includes(email.toLowerCase())) return "admin";
  return "user";
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = user.email ?? "";
  const role = resolveRole(user.id, email);

  if (role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }

  req.userId = user.id;
  req.userEmail = email;
  next();
}
