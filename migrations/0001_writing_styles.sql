-- Additive: no existing writing, user, or project records are changed.
CREATE TABLE IF NOT EXISTS writing_styles (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  name text NOT NULL,
  definition jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS writing_styles_user_name_unique ON writing_styles (user_id, name);
