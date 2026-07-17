-- Remove the study-progress feature entirely. The `progress` table (added in
-- 0001, never given an RLS policy and never populated) tracked which plays a
-- viewer had stepped through per position; the product no longer tracks this.
drop table if exists progress;
