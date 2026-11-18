-- Protection metadata only. Never changes or removes a saved prose payload.
ALTER TABLE public.prose_versions
 ADD COLUMN kept_at timestamptz,
 ADD COLUMN restore_protected boolean NOT NULL DEFAULT false,
 ADD COLUMN session_checkpoint boolean NOT NULL DEFAULT false;
-- Preserve the source, result and outgoing checkpoint of every pre-policy restore.
UPDATE public.prose_versions target SET restore_protected = true
FROM public.prose_versions restoration
WHERE restoration.kind = 'restore'
 AND target.project_id = restoration.project_id
 AND target.resource = restoration.resource
 AND target.document_id = restoration.document_id
 AND (target.id = restoration.id OR target.id = restoration.restored_from_id
 OR target.id = (SELECT previous.id FROM public.prose_versions previous
   WHERE previous.project_id=restoration.project_id AND previous.resource=restoration.resource
    AND previous.document_id=restoration.document_id AND previous.revision < restoration.revision
   ORDER BY previous.revision DESC LIMIT 1));
