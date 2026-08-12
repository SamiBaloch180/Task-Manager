import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function toLocalDate(d = new Date()) {
  return d.toISOString().split("T")[0];
}

async function enrichAttendance(records: Record<string, unknown>[]) {
  if (!records.length) return [];
  const ids = [...new Set(records.map((r) => r.employee_id as string))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string; email: string }) => [
      p.id,
      {
        name: p.full_name,
        displayId: p.email.includes("@taskforce.local")
          ? p.email.split("@")[0].toUpperCase()
          : p.email,
      },
    ]),
  );

  return records.map((r) => {
    const prof = profileMap.get(r.employee_id as string);
    return {
      id: r.id,
      employeeId: r.employee_id,
      employeeName: prof?.name ?? null,
      displayUserId: prof?.displayId ?? null,
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out ?? null,
      status: r.status,
    };
  });
}

// GET /attendance
router.get("/attendance", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const isAdmin = req.userProfile?.role === "admin";

  let query = supabaseAdmin.from("attendance").select("*").order("date", { ascending: false });
  if (!isAdmin) query = query.eq("employee_id", req.supabaseUserId!);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json(await enrichAttendance(data ?? []));
});

// GET /attendance/today
router.get("/attendance/today", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const today = toLocalDate();
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("employee_id", req.supabaseUserId!)
    .eq("date", today)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "No attendance record for today" }); return; }

  const [enriched] = await enrichAttendance([data]);
  res.json(enriched);
});

// POST /attendance/check-in
router.post("/attendance/check-in", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const today = toLocalDate();

  // Check if already checked in
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("employee_id", req.supabaseUserId!)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    res.status(409).json({ error: "Already checked in today" });
    return;
  }

  const now = new Date();
  const status = "present"; // always present — no time restrictions

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      employee_id: req.supabaseUserId,
      date: today,
      check_in: now.toISOString(),
      status,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }

  const [enriched] = await enrichAttendance([data]);
  res.status(201).json(enriched);
});

// POST /attendance/check-out
router.post("/attendance/check-out", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const today = toLocalDate();

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("employee_id", req.supabaseUserId!)
    .eq("date", today)
    .maybeSingle();

  if (fetchErr || !existing) {
    res.status(404).json({ error: "No check-in record found for today. Please check in first." });
    return;
  }

  if (existing.check_out) {
    res.status(409).json({ error: "Already checked out today" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update({ check_out: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }

  const [enriched] = await enrichAttendance([data]);
  res.json(enriched);
});

export default router;
