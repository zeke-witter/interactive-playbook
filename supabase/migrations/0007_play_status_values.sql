-- Accounts & Auth — Phase 4a: expand play_status.
-- Separate migration (enum-only, no usage) because Postgres cannot add an enum
-- value and use it within the same transaction. 'published'/'archived' already
-- exist (0001). 'hidden' is used this phase (captain hide); 'pending'/'denied'
-- are for the Phase 5 submit/approve queue but cost nothing to add now.
alter type play_status add value if not exists 'pending';
alter type play_status add value if not exists 'hidden';
alter type play_status add value if not exists 'denied';
