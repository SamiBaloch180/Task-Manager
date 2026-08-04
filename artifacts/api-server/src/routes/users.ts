import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "../middlewares/requireAuth";

const router = Router();

// GET /users/me — get own profile
router.get(
  "/users/me",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.userProfile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const p = req.userProfile;
    res.json({
      id: p.id,
      clerkId: p.id,
      fullName: p.full_name,
      email: p.email,
      role: p.role,
      isActive: p.is_active,
      createdAt: p.created_at,
    });
  },
);

// POST /users/me/sync — JIT provision profile
router.post(
  "/users/me/sync",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const { fullName, email } = req.body as {
      fullName?: string;
      email?: string;
    };
    if (!fullName || !email) {
      res.status(400).json({ error: "fullName and email are required" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: req.supabaseUserId,
          full_name: fullName,
          email,
          role: "employee",
          is_active: true,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({
      id: data.id,
      clerkId: data.id,
      fullName: data.full_name,
      email: data.email,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
    });
  },
);

// GET /users — admin: list all users
router.get(
  "/users",
  requireAdmin,
  async (_req: AuthRequest, res): Promise<void> => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(
      (data ?? []).map((p) => ({
        id: p.id,
        clerkId: p.id,
        fullName: p.full_name,
        email: p.email,
        role: p.role,
        isActive: p.is_active,
        createdAt: p.created_at,
      })),
    );
  },
);

// GET /users/:userId — admin: get single user
router.get(
  "/users/:userId",
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    const { userId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: data.id,
      clerkId: data.id,
      fullName: data.full_name,
      email: data.email,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
    });
  },
);

// PATCH /users/:userId — admin: update user
router.patch(
  "/users/:userId",
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    const { userId } = req.params;
    const { fullName, isActive, role } = req.body as {
      fullName?: string;
      isActive?: boolean;
      role?: "admin" | "employee";
    };

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (isActive !== undefined) updates.is_active = isActive;
    if (role !== undefined) updates.role = role;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: data.id,
      clerkId: data.id,
      fullName: data.full_name,
      email: data.email,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
    });
  },
);

export default router;
