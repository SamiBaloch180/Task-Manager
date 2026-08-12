-- Run this FIRST if you get "Database error creating new user"
-- It removes any partially-created triggers from a previous schema run.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
