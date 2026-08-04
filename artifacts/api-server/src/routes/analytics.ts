import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAdmin, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

// GET /analytics/dashboard
router.get("/analytics/dashboard", requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalTasks },
    { count: pendingTasks },
    { count: inProgressTasks },
    { count: completedTasks },
    { count: incompleteTasks },
    { count: totalEmployees },
    { count: presentToday },
    { count: overdueTasksCount },
  ] = await Promise.all([
    supabaseAdmin.from("tasks").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("tasks").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabaseAdmin.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabaseAdmin.from("tasks").select("*", { count: "exact", head: true }).eq("status", "incomplete"),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "employee").eq("is_active", true),
    supabaseAdmin.from("attendance").select("*", { count: "exact", head: true }).eq("date", today),
    supabaseAdmin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "in_progress"])
      .lt("deadline", new Date().toISOString()),
  ]);

  res.json({
    totalTasks: totalTasks ?? 0,
    pendingTasks: pendingTasks ?? 0,
    inProgressTasks: inProgressTasks ?? 0,
    completedTasks: completedTasks ?? 0,
    incompleteTasks: incompleteTasks ?? 0,
    totalEmployees: totalEmployees ?? 0,
    presentToday: presentToday ?? 0,
    overdueTasksCount: overdueTasksCount ?? 0,
  });
});

// GET /analytics/task-status-breakdown
router.get("/analytics/task-status-breakdown", requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const statuses = ["pending", "in_progress", "completed", "incomplete"];
  const counts = await Promise.all(
    statuses.map((s) =>
      supabaseAdmin.from("tasks").select("*", { count: "exact", head: true }).eq("status", s),
    ),
  );
  res.json(statuses.map((s, i) => ({ status: s, count: counts[i].count ?? 0 })));
});

// GET /analytics/attendance-summary (last 7 days)
router.get("/analytics/attendance-summary", requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("date, status")
    .gte("date", days[0])
    .lte("date", days[days.length - 1]);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const summary = days.map((date) => {
    const dayRecords = (data ?? []).filter((r: { date: string }) => r.date === date);
    return {
      date,
      present: dayRecords.filter((r: { status: string }) => r.status === "present").length,
      absent: dayRecords.filter((r: { status: string }) => r.status === "absent").length,
      late: dayRecords.filter((r: { status: string }) => r.status === "late").length,
      total: dayRecords.length,
    };
  });

  res.json(summary);
});

export default router;
