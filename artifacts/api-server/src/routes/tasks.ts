import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "../middlewares/requireAuth";

const router = Router();

function calcDeadline(durationValue: number, durationUnit: string): Date {
  const ms =
    durationUnit === "hours"
      ? durationValue * 3600_000
      : durationUnit === "days"
        ? durationValue * 86400_000
        : durationValue * 7 * 86400_000;
  return new Date(Date.now() + ms);
}

function formatTask(t: Record<string, unknown>, assignedToName?: string | null, assignedByName?: string | null) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assignedTo: t.assigned_to,
    assignedBy: t.assigned_by,
    assignedToName: assignedToName ?? null,
    assignedByName: assignedByName ?? null,
    durationValue: t.duration_value,
    durationUnit: t.duration_unit,
    status: t.status,
    createdAt: t.created_at,
    deadline: t.deadline,
    completedAt: t.completed_at ?? null,
  };
}

async function enrichTasks(tasks: Record<string, unknown>[]) {
  if (!tasks.length) return [];

  const userIds = [
    ...new Set([
      ...tasks.map((t) => t.assigned_to as string),
      ...tasks.map((t) => t.assigned_by as string),
    ]),
  ];

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
  );

  return tasks.map((t) =>
    formatTask(
      t,
      nameMap.get(t.assigned_to as string) ?? null,
      nameMap.get(t.assigned_by as string) ?? null,
    ),
  );
}

// GET /tasks
router.get("/tasks", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const isAdmin = req.userProfile?.role === "admin";

  let query = supabaseAdmin.from("tasks").select("*").order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("assigned_to", req.supabaseUserId!);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Auto-expire overdue tasks — mark pending/in_progress tasks past their deadline as incomplete
  const now = new Date().toISOString();
  const overdueIds = (data ?? [])
    .filter(
      (t) =>
        (t.status === "pending" || t.status === "in_progress") &&
        t.deadline &&
        t.deadline < now,
    )
    .map((t) => t.id as string);

  if (overdueIds.length > 0) {
    await supabaseAdmin
      .from("tasks")
      .update({ status: "incomplete", completed_at: null })
      .in("id", overdueIds);

    // Patch in-memory so we return updated status without a second DB round-trip
    for (const t of data ?? []) {
      if (overdueIds.includes(t.id as string)) {
        t.status = "incomplete";
        t.completed_at = null;
      }
    }
  }

  res.json(await enrichTasks(data ?? []));
});

// POST /tasks — admin only
router.post("/tasks", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, assignedTo, durationValue, durationUnit } =
    req.body as {
      title?: string;
      description?: string;
      assignedTo?: string;
      durationValue?: number;
      durationUnit?: string;
    };

  if (!title || !assignedTo || !durationValue || !durationUnit) {
    res.status(400).json({ error: "title, assignedTo, durationValue, durationUnit are required" });
    return;
  }

  const deadline = calcDeadline(durationValue, durationUnit);

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      title,
      description: description ?? "",
      assigned_to: assignedTo,
      assigned_by: req.supabaseUserId,
      duration_value: durationValue,
      duration_unit: durationUnit,
      deadline: deadline.toISOString(),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const [enriched] = await enrichTasks([data]);
  res.status(201).json(enriched);
});

// GET /tasks/:taskId
router.get("/tasks/:taskId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { taskId } = req.params;
  const { data, error } = await supabaseAdmin.from("tasks").select("*").eq("id", taskId).single();

  if (error || !data) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const isAdmin = req.userProfile?.role === "admin";
  if (!isAdmin && data.assigned_to !== req.supabaseUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [enriched] = await enrichTasks([data]);
  res.json(enriched);
});

// PUT /tasks/:taskId — admin only
router.put("/tasks/:taskId", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { taskId } = req.params;
  const { title, description, assignedTo, durationValue, durationUnit } =
    req.body as {
      title?: string;
      description?: string;
      assignedTo?: string;
      durationValue?: number;
      durationUnit?: string;
    };

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;
  if (durationValue !== undefined) updates.duration_value = durationValue;
  if (durationUnit !== undefined) updates.duration_unit = durationUnit;

  if (durationValue !== undefined || durationUnit !== undefined) {
    const { data: existing } = await supabaseAdmin.from("tasks").select("duration_value, duration_unit").eq("id", taskId).single();
    if (existing) {
      const finalValue = durationValue ?? existing.duration_value;
      const finalUnit = durationUnit ?? existing.duration_unit;
      updates.deadline = calcDeadline(finalValue, finalUnit).toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [enriched] = await enrichTasks([data]);
  res.json(enriched);
});

// DELETE /tasks/:taskId — admin only
router.delete("/tasks/:taskId", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { taskId } = req.params;
  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", taskId);

  if (error) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

// PATCH /tasks/:taskId/status
router.patch("/tasks/:taskId/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { taskId } = req.params;
  const { status } = req.body as { status?: string };

  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const { data: existing } = await supabaseAdmin.from("tasks").select("*").eq("id", taskId).single();
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const isAdmin = req.userProfile?.role === "admin";
  if (!isAdmin && existing.assigned_to !== req.supabaseUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updates: Record<string, unknown> = { status };
  if (status === "completed") updates.completed_at = new Date().toISOString();
  else updates.completed_at = null;

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Update failed" });
    return;
  }

  const [enriched] = await enrichTasks([data]);
  res.json(enriched);
});

export default router;
