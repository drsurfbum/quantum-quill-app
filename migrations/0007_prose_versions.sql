-- Additive: no backfill, rewriting, pruning, or changes to current manuscripts.
CREATE TABLE public.prose_versions (
 id serial PRIMARY KEY,
 project_id integer NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 resource text NOT NULL CHECK (resource IN ('chapters','scenes')),
 document_id integer NOT NULL,
 revision integer NOT NULL CHECK (revision >= 0),
 title text NOT NULL, content text,
 saved_at timestamptz NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(),
 kind text NOT NULL CHECK (kind IN ('baseline','save','restore')),
 restored_from_id integer, request_id text,
 CHECK ((kind = 'restore') = (restored_from_id IS NOT NULL AND request_id IS NOT NULL))
);
CREATE UNIQUE INDEX prose_versions_revision ON public.prose_versions(project_id,resource,document_id,revision);
CREATE UNIQUE INDEX prose_versions_request ON public.prose_versions(project_id,resource,document_id,request_id);
CREATE INDEX prose_versions_page ON public.prose_versions(project_id,resource,document_id,id);
