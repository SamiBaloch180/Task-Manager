import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

/**
 * POST /auth/register
 * Creates a user via the admin API so email confirmation is skipped entirely.
 * The service-role key has authority to auto-confirm.
 */
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, fullName } = req.body as {
    email?: string;
    password?: string;
    fullName?: string;
  };

  if (!email || !password || !fullName) {
    res.status(400).json({ error: "email, password, and fullName are required" });
    return;
  }

  // Use admin client to create user with email already confirmed
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skips the email confirmation step
    user_metadata: {
      full_name: fullName,
      role: "employee",
    },
  });

  if (error) {
    // Log the full error so we can see it in server logs
    console.error("[register] createUser error:", JSON.stringify(error));

    const msg: string =
      (error as { message?: string }).message ??
      (error as { msg?: string }).msg ??
      JSON.stringify(error);

    if (msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already been registered") ||
        msg.toLowerCase().includes("user already") ||
        (error as { status?: number }).status === 422) {
      res.status(409).json({ error: "An account with this email already exists." });
    } else {
      res.status(400).json({ error: msg || "Registration failed. Please try again." });
    }
    return;
  }

  // Sign in immediately to get a session token
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    // User created but couldn't auto-sign in — frontend can handle sign-in manually
    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName,
      },
      session: null,
      message: "Account created. Please sign in.",
    });
    return;
  }

  res.status(201).json({
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName,
    },
    session: signInData.session,
    message: "Account created and signed in.",
  });
});

/**
 * POST /auth/confirm-existing
 * For any previously-created unconfirmed user — confirms their email via admin.
 */
router.post("/auth/confirm-existing", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  // Find user by email
  const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    res.status(500).json({ error: listErr.message });
    return;
  }

  const user = listData.users.find((u) => u.email === email);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.email_confirmed_at) {
    res.json({ message: "Email already confirmed" });
    return;
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  if (updateErr) {
    res.status(500).json({ error: updateErr.message });
    return;
  }

  res.json({ message: "Email confirmed. You can now sign in." });
});

export default router;
