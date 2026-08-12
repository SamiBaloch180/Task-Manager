import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase admin client ────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function getUser(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function getProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

function formatProfile(p: Record<string, unknown>) {
  return {
    id: p.id,
    clerkId: p.id,
    fullName: p.full_name,
    email: p.email,
    role: p.role,
    status: p.status,
    isActive: p.is_active,
    createdAt: p.created_at,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Normalize path: strip /api prefix if present
  const rawPath = (req.query["path"] as string[] | undefined)?.join("/") ?? "";
  const path = rawPath.startsWith("api/") ? rawPath.slice(4) : rawPath;
  const method = req.method?.toUpperCase() ?? "GET";

  // ─── Health check ────────────────────────────────────────────────────────────
  if (path === "health" && method === "GET") {
    return res.status(200).json({ status: "ok", ts: Date.now() });
  }

  // ─── POST /auth/register ──────────────────────────────────────────────────────
  if (path === "auth/register" && method === "POST") {
    const { email, password, fullName } = req.body ?? {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "email, password, and fullName are required" });
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "employee" },
    });
    if (error) {
      const msg = error.message ?? "Registration failed";
      if (msg.toLowerCase().includes("already")) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
      return res.status(400).json({ error: msg });
    }
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    return res.status(201).json({
      user: { id: data.user.id, email: data.user.email, fullName },
      session: signInData?.session ?? null,
    });
  }

  // ─── POST /auth/confirm-existing ──────────────────────────────────────────────
  if (path === "auth/confirm-existing" && method === "POST") {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ error: "email is required" });
    const { data: listData } = await supabase.auth.admin.listUsers();
    const user = listData?.users.find((u) => u.email === email);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.email_confirmed_at) return res.json({ message: "Email already confirmed" });
    await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    return res.json({ message: "Email confirmed. You can now sign in." });
  }

  // ── Auth-required routes ─────────────────────────────────────────────────────
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const authUser = await getUser(token);
  if (!authUser) return res.status(401).json({ error: "Invalid or expired token" });

  const profile = await getProfile(authUser.id);

  // ─── GET /users/me ─────────────────────────────────────────────────────────
  if (path === "users/me" && method === "GET") {
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    return res.json(formatProfile(profile));
  }

  // ─── POST /users/me/sync ──────────────────────────────────────────────────
  if (path === "users/me/sync" && method === "POST") {
    const { fullName, email } = req.body ?? {};
    if (!fullName || !email) {
      return res.status(400).json({ error: "fullName and email are required" });
    }
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.id, full_name: fullName, email,
        role: "employee", status: "pending", is_active: true,
      }, { onConflict: "id" })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(formatProfile(data));
  }

  // ── Admin check ──────────────────────────────────────────────────────────────
  const isAdmin = profile?.role === "admin";

  // ─── GET /users ────────────────────────────────────────────────────────────
  if (path === "users" && method === "GET") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { data, error } = await supabase
      .from("profiles").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json((data ?? []).map(formatProfile));
  }

  // ─── GET /users/:id ────────────────────────────────────────────────────────
  const userByIdMatch = path.match(/^users\/([^/]+)$/);
  if (userByIdMatch && method === "GET") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userByIdMatch[1]).single();
    if (error || !data) return res.status(404).json({ error: "User not found" });
    return res.json(formatProfile(data));
  }

  // ─── PATCH /users/:id ──────────────────────────────────────────────────────
  if (userByIdMatch && method === "PATCH") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { fullName, isActive, role, status } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (isActive !== undefined) updates.is_active = isActive;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userByIdMatch[1]).select().single();
    if (error || !data) return res.status(404).json({ error: "User not found" });
    return res.json(formatProfile(data));
  }

  // ─── DELETE /users/:id ─────────────────────────────────────────────────────
  if (userByIdMatch && method === "DELETE") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const uid = userByIdMatch[1];
    await supabase.from("tasks").delete().eq("assigned_to", uid);
    await supabase.from("attendance").delete().eq("employee_id", uid);
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  // ─── GET /tasks ────────────────────────────────────────────────────────────
  if (path === "tasks" && method === "GET") {
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("assigned_to", authUser.id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
  }

  // ─── POST /tasks ───────────────────────────────────────────────────────────
  if (path === "tasks" && method === "POST") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { title, description, assignedTo, priority, dueDate, status } = req.body ?? {};
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title, description, assigned_to: assignedTo, priority, due_date: dueDate, status: status ?? "todo" })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // ─── PATCH /tasks/:id ──────────────────────────────────────────────────────
  const taskByIdMatch = path.match(/^tasks\/([^/]+)$/);
  if (taskByIdMatch && method === "PATCH") {
    const { title, description, status, priority, dueDate } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.due_date = dueDate;
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskByIdMatch[1]).select().single();
    if (error || !data) return res.status(404).json({ error: "Task not found" });
    return res.json(data);
  }

  // ─── DELETE /tasks/:id ─────────────────────────────────────────────────────
  if (taskByIdMatch && method === "DELETE") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { error } = await supabase.from("tasks").delete().eq("id", taskByIdMatch[1]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  // ─── GET /attendance ───────────────────────────────────────────────────────
  if (path === "attendance" && method === "GET") {
    let query = supabase.from("attendance").select("*").order("date", { ascending: false });
    if (!isAdmin) query = query.eq("employee_id", authUser.id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
  }

  // ─── POST /attendance/check-in ─────────────────────────────────────────────
  if (path === "attendance/check-in" && method === "POST") {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("attendance").select("*").eq("employee_id", authUser.id).eq("date", today).single();
    if (existing) return res.status(409).json({ error: "Already checked in today" });
    const { data, error } = await supabase.from("attendance").insert({ employee_id: authUser.id, date: today, check_in: new Date().toISOString() }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // ─── POST /attendance/check-out ────────────────────────────────────────────
  if (path === "attendance/check-out" && method === "POST") {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("attendance").select("*").eq("employee_id", authUser.id).eq("date", today).single();
    if (!existing) return res.status(404).json({ error: "No check-in found for today" });
    if (existing.check_out) return res.status(409).json({ error: "Already checked out today" });
    const checkOut = new Date().toISOString();
    const durationMs = new Date(checkOut).getTime() - new Date(existing.check_in).getTime();
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
    const { data, error } = await supabase.from("attendance").update({ check_out: checkOut, duration: durationHours }).eq("id", existing.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ─── GET /analytics ────────────────────────────────────────────────────────
  if (path === "analytics" && method === "GET") {
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: totalTasks } = await supabase.from("tasks").select("*", { count: "exact", head: true });
    const { count: completedTasks } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed");
    const today = new Date().toISOString().split("T")[0];
    const { count: todayAttendance } = await supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today);
    return res.json({ totalUsers, totalTasks, completedTasks, todayAttendance });
  }

  return res.status(404).json({ error: `Route not found: ${method} /${path}` });
}
