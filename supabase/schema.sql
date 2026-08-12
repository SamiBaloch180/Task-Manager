-- ============================================================
-- Role-Based Task Manager — Supabase Schema
-- Run this in your Supabase SQL editor to set up all tables.
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create a profile row when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  assigned_to    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by    UUID NOT NULL REFERENCES profiles(id),
  duration_value INTEGER NOT NULL,
  duration_unit  TEXT NOT NULL CHECK (duration_unit IN ('hours', 'days', 'weeks')),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'completed', 'incomplete')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline       TIMESTAMPTZ NOT NULL,
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline     ON tasks(deadline);

-- 3. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  check_in     TIMESTAMPTZ NOT NULL,
  check_out    TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'present'
                 CHECK (status IN ('present', 'absent', 'late')),
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance  ENABLE ROW LEVEL SECURITY;

-- profiles: users can read everyone (for dropdowns), admins can update any row
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth.uid() = id
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- tasks: admins see/modify all; employees only see their own
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- attendance: admins see all; employees see own
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR employee_id = auth.uid()
);

DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (
  employee_id = auth.uid()
);

DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR employee_id = auth.uid()
);
