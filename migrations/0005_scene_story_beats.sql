-- Add scene-level beats without altering summaries, manuscript prose or legacy outline notes.
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS story_beats jsonb NOT NULL DEFAULT '[]'::jsonb;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'scenes'::regclass AND conname = 'scene_story_beats_array') THEN
    ALTER TABLE scenes ADD CONSTRAINT scene_story_beats_array CHECK (jsonb_typeof(story_beats) = 'array');
  END IF;
END $$;
