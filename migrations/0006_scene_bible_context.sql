-- Additive only: no recovered scenes, prose, Bible fields, or relationships are changed.
CREATE TABLE IF NOT EXISTS scene_bible_contexts (
  scene_id integer PRIMARY KEY REFERENCES scenes(id) ON DELETE RESTRICT,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array')
);
CREATE INDEX IF NOT EXISTS scene_bible_contexts_project ON scene_bible_contexts(project_id);
