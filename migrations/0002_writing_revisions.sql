-- Metadata-only additions on supported PostgreSQL: no writing is normalized,
-- reclassified, or rewritten. Every acknowledged update increments its revision.
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE outline_items ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE story_bible_entries ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE plot_structure_sections ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE plot_structures ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE whiteboards ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
