-- One-time migration: fix the table-name typo (birdle_leaderboad -> birdle_leaderboard).
-- Run this on the live Supabase project BEFORE deploying the code that references
-- the corrected name. Safe to re-run: every statement is a no-op once applied.
--
-- Notes:
-- - Renaming a table keeps its RLS policies, grants, triggers, and Realtime
--   publication membership (they reference the table internally, not by name).
-- - Constraint names still contain the old typo; they are internal-only and
--   cosmetic, so they are intentionally left as-is.

begin;

alter table if exists public.birdle_leaderboad
  rename to birdle_leaderboard;

alter index if exists public.birdle_leaderboad_score_created_idx
  rename to birdle_leaderboard_score_created_idx;

commit;
