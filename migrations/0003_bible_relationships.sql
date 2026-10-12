-- Additive overlay only. No recovered entry is modified.
CREATE TABLE IF NOT EXISTS bible_relationships (
  id text NOT NULL,
  project_id integer NOT NULL,
  source_id integer NOT NULL,
  target_id integer NOT NULL,
  relationship_type text NOT NULL,
  role text NOT NULL DEFAULT '',
  context text NOT NULL DEFAULT '',
  start_date text NOT NULL DEFAULT '',
  end_date text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  is_deleted boolean NOT NULL DEFAULT false,
  legacy_payload jsonb,
  request_hash text,
  PRIMARY KEY (project_id, id),
  CHECK (source_id <> target_id OR is_deleted)
);
CREATE INDEX IF NOT EXISTS bible_relationships_project ON bible_relationships(project_id);
CREATE INDEX IF NOT EXISTS bible_relationships_target ON bible_relationships(project_id, target_id);
