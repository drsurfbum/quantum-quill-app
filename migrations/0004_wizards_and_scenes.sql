-- Additive only: no chapter content, metadata or original payload is rewritten.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS writing_mode text NOT NULL DEFAULT 'chapter';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'chapters'::regclass AND conname = 'chapter_writing_mode') THEN
    ALTER TABLE chapters ADD CONSTRAINT chapter_writing_mode CHECK (writing_mode IN ('chapter', 'scenes') AND (writing_mode = 'chapter' OR COALESCE(content, '') = ''));
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS scenes (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  chapter_id integer NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
  linked_section_id integer REFERENCES plot_structure_sections(id) ON DELETE RESTRICT,
  title text NOT NULL, summary text NOT NULL DEFAULT '', content text NOT NULL DEFAULT '',
  "order" integer NOT NULL, revision integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scenes_project_chapter_order ON scenes(project_id, chapter_id, "order");
CREATE TABLE IF NOT EXISTS creation_requests (
  scope integer NOT NULL, request_id text NOT NULL, kind text NOT NULL, request_hash text NOT NULL,
  result jsonb NOT NULL, created_at timestamp NOT NULL DEFAULT now(), PRIMARY KEY(scope, request_id)
);
