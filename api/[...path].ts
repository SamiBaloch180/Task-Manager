import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase admin client ────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractToken(req: IncomingMessage): string | null {
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

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: unknown) => { data += String(chunk); });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(json);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: IncomingMessage & { query?: Record<string, string | string[]> }, res: ServerResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  // Normalize path: Vercel passes the catch-all segments via query["path"]
  const segments = req.query?.["path"];
  const rawPath = Array.isArray(segments) ? segments.join("/") : (segments ?? "");
  // Strip leading "api/" if Vercel forwards it
  const path = rawPath.startsWith("api/") ? rawPath.slice(4) : rawPath;
  const method = req.method?.toUpperCase() ?? "GET";

  // ─── Health check ────────────────────────────────────────────────────────────
  if (path === "health" && method === "GET") {
    return send(res, 200, { status: "ok", ts: Date.now() });
  }

  const body = method !== "GET" && method !== "DELETE" ? await readBody(req) : {};

  // ─── POST /auth/register ──────────────────────────────────────────────────────
  if (path === "auth/register" && method === "POST") {
    const { email, password, fullName } = body as Record<string, string>;
    if (!email || !password || !fullName) {
      return send(res, 400, { error: "email, password, and fullName are required" });
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "employee" },
    });
    if (error) {
      const msg = error.message ?? "Registration failed";
      if (msg.toLowerCase().includes("already")) {
        return send(res, 409, { error: "An account with this email already exists." });
      }
      return send(res, 400, { error: msg });
    }
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    return send(res, 201, {
      user: { id: data.user.id, email: data.user.email, fullName },
      session: signInData?.session ?? null,
    });
  }

  // ─── POST /auth/confirm-existing ──────────────────────────────────────────────
  if (path === "auth/confirm-existing" && method === "POST") {
    const { email } = body as Record<string, string>;
    if (!email) return send(res, 400, { error: "email is required" });
    const { data: listData } = await supabase.auth.admin.listUsers();
    const user = listData?.users.find((u: { email?: string }) => u.email === email);
    if (!user) return send(res, 404, { error: "User not found" });
    if (user.email_confirmed_at) return send(res, 200, { message: "Email already confirmed" });
    await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    return send(res, 200, { message: "Email confirmed. You can now sign in." });
  }

  // ── Auth-required routes ─────────────────────────────────────────────────────
  const token = extractToken(req);
  if (!token) return send(res, 401, { error: "Unauthorized" });

  const authUser = await getUser(token);
  if (!authUser) return send(res, 401, { error: "Invalid or expired token" });

  const profile = await getProfile(authUser.id);
  const isAdmin = profile?.role === "admin";

  // ─── GET /users/me ─────────────────────────────────────────────────────────
  if (path === "users/me" && method === "GET") {
    if (!profile) return send(res, 404, { error: "Profile not found" });
    return send(res, 200, formatProfile(profile));
  }

  // ─── POST /users/me/sync ──────────────────────────────────────────────────
  if (path === "users/me/sync" && method === "POST") {
    const { fullName, email } = body as Record<string, string>;
    if (!fullName || !email) {
      return send(res, 400, { error: "fullName and email are required" });
    }
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.id, full_name: fullName, email,
        role: "employee", status: "pending", is_active: true,
      }, { onConflict: "id" })
      .select().single();
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, formatProfile(data));
  }

  // ─── GET /users ────────────────────────────────────────────────────────────
  if (path === "users" && method === "GET") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const { data, error } = await supabase
      .from("profiles").select("*").order("created_at", { ascending: false });
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, (data ?? []).map(formatProfile));
  }

  const userByIdMatch = path.match(/^users\/([^/]+)$/);

  // ─── GET /users/:id ────────────────────────────────────────────────────────
  if (userByIdMatch && method === "GET") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userByIdMatch[1]).single();
    if (error || !data) return send(res, 404, { error: "User not found" });
    return send(res, 200, formatProfile(data));
  }

  // ─── PATCH /users/:id ──────────────────────────────────────────────────────
  if (userByIdMatch && method === "PATCH") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const { fullName, isActive, role, status } = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (isActive !== undefined) updates.is_active = isActive;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userByIdMatch[1]).select().single();
    if (error || !data) return send(res, 404, { error: "User not found" });
    return send(res, 200, formatProfile(data));
  }

  // ─── DELETE /users/:id ─────────────────────────────────────────────────────
  if (userByIdMatch && method === "DELETE") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const uid = userByIdMatch[1];
    await supabase.from("tasks").delete().eq("assigned_to", uid);
    await supabase.from("attendance").delete().eq("employee_id", uid);
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) return send(res, 500, { error: error.message });
    res.writeHead(204); res.end();
    return;
  }

  // ─── GET /tasks ────────────────────────────────────────────────────────────
  if (path === "tasks" && method === "GET") {
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("assigned_to", authUser.id);
    const { data, error } = await query;
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, data ?? []);
  }

  // ─── POST /tasks ───────────────────────────────────────────────────────────
  if (path === "tasks" && method === "POST") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const { title, description, assignedTo, priority, dueDate, status } = body as Record<string, unknown>;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title, description, assigned_to: assignedTo, priority, due_date: dueDate, status: status ?? "todo" })
      .select().single();
    if (error) return send(res, 500, { error: error.message });
    return send(res, 201, data);
  }

  const taskByIdMatch = path.match(/^tasks\/([^/]+)$/);

  // ─── PATCH /tasks/:id ──────────────────────────────────────────────────────
  if (taskByIdMatch && method === "PATCH") {
    const { title, description, status, priority, dueDate } = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.due_date = dueDate;
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskByIdMatch[1]).select().single();
    if (error || !data) return send(res, 404, { error: "Task not found" });
    return send(res, 200, data);
  }

  // ─── DELETE /tasks/:id ─────────────────────────────────────────────────────
  if (taskByIdMatch && method === "DELETE") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const { error } = await supabase.from("tasks").delete().eq("id", taskByIdMatch[1]);
    if (error) return send(res, 500, { error: error.message });
    res.writeHead(204); res.end();
    return;
  }

  // ─── GET /attendance ───────────────────────────────────────────────────────
  if (path === "attendance" && method === "GET") {
    let query = supabase.from("attendance").select("*").order("date", { ascending: false });
    if (!isAdmin) query = query.eq("employee_id", authUser.id);
    const { data, error } = await query;
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, data ?? []);
  }

  // ─── POST /attendance/check-in ─────────────────────────────────────────────
  if (path === "attendance/check-in" && method === "POST") {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("attendance").select("*").eq("employee_id", authUser.id).eq("date", today).single();
    if (existing) return send(res, 409, { error: "Already checked in today" });
    const { data, error } = await supabase.from("attendance").insert({ employee_id: authUser.id, date: today, check_in: new Date().toISOString() }).select().single();
    if (error) return send(res, 500, { error: error.message });
    return send(res, 201, data);
  }

  // ─── POST /attendance/check-out ────────────────────────────────────────────
  if (path === "attendance/check-out" && method === "POST") {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("attendance").select("*").eq("employee_id", authUser.id).eq("date", today).single();
    if (!existing) return send(res, 404, { error: "No check-in found for today" });
    if (existing.check_out) return send(res, 409, { error: "Already checked out today" });
    const checkOut = new Date().toISOString();
    const durationMs = new Date(checkOut).getTime() - new Date(existing.check_in).getTime();
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
    const { data, error } = await supabase.from("attendance").update({ check_out: checkOut, duration: durationHours }).eq("id", existing.id).select().single();
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, data);
  }

  // ─── GET /analytics ────────────────────────────────────────────────────────
  if (path === "analytics" && method === "GET") {
    if (!isAdmin) return send(res, 403, { error: "Admin access required" });
    const [
      { count: totalUsers },
      { count: totalTasks },
      { count: completedTasks },
      { count: todayAttendance },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", new Date().toISOString().split("T")[0]),
    ]);
    return send(res, 200, { totalUsers, totalTasks, completedTasks, todayAttendance });
  }

  return send(res, 404, { error: `Route not found: ${method} /${path}` });
}
