import type { Request, Response, NextFunction } from "express";
import { verifyToken, supabaseAdmin } from "../lib/supabase";

export interface AuthRequest extends Request {
  supabaseUserId?: string;
  userProfile?: {
    id: string;
    full_name: string;
    email: string;
    role: "admin" | "employee";
    is_active: boolean;
    created_at: string;
  } | null;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.supabaseUserId = user.id;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  req.userProfile = profile ?? null;
  next();
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.userProfile || req.userProfile.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
