-- Fresh empty alpha database only. Generated from shared/schema.ts on 2026-10-24.
-- Do not edit after first deployment; add reviewed migrations for later changes.
CREATE TABLE "bible_relationships" (
	"id" text NOT NULL,
	"project_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"start_date" text DEFAULT '' NOT NULL,
	"end_date" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"legacy_payload" jsonb,
	"request_hash" text,
	CONSTRAINT "bible_relationships_project_id_id_pk" PRIMARY KEY("project_id","id")
);

CREATE TABLE "chapters" (
	"writing_mode" text DEFAULT 'chapter' NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '',
	"project_id" integer NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_draft" boolean DEFAULT true,
	CONSTRAINT "chapter_writing_mode" CHECK ("chapters"."writing_mode" IN ('chapter', 'scenes') AND ("chapters"."writing_mode" = 'chapter' OR COALESCE("chapters"."content", '') = ''))
);

CREATE TABLE "creation_requests" (
	"scope" integer NOT NULL,
	"request_id" text NOT NULL,
	"kind" text NOT NULL,
	"request_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creation_requests_scope_request_id_pk" PRIMARY KEY("scope","request_id")
);

CREATE TABLE "outline_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '',
	"parent_id" integer,
	"order" integer NOT NULL,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "plot_structure_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"plot_structure_id" integer NOT NULL,
	"section_key" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '',
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "plot_structure_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sections" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_default" boolean DEFAULT false
);

CREATE TABLE "plot_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"project_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" integer,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "projects" (
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_archived" boolean DEFAULT false,
	"is_trashed" boolean DEFAULT false
);

CREATE TABLE "scene_bible_contexts" (
	"scene_id" integer PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "scene_bible_contexts_revision_check" CHECK ("scene_bible_contexts"."revision" >= 0),
	CONSTRAINT "scene_bible_contexts_links_check" CHECK (jsonb_typeof("scene_bible_contexts"."links") = 'array')
);

CREATE TABLE "scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"linked_section_id" integer,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"story_beats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"order" integer NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scene_story_beats_array" CHECK (jsonb_typeof("scenes"."story_beats") = 'array')
);

CREATE TABLE "story_bible_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"project_id" integer NOT NULL,
	"entry_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '',
	"category" text,
	"subcategory" text,
	"tags" text[],
	"related_entry_ids" integer[],
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_archived" boolean DEFAULT false,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

CREATE TABLE "whiteboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"canvas_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "writing_styles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "scene_bible_contexts" ADD CONSTRAINT "scene_bible_contexts_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "scene_bible_contexts" ADD CONSTRAINT "scene_bible_contexts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_linked_section_id_plot_structure_sections_id_fk" FOREIGN KEY ("linked_section_id") REFERENCES "public"."plot_structure_sections"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "writing_styles" ADD CONSTRAINT "writing_styles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "scene_bible_contexts_project" ON "scene_bible_contexts" USING btree ("project_id");
CREATE INDEX "scenes_project_chapter_order" ON "scenes" USING btree ("project_id","chapter_id","order");
CREATE UNIQUE INDEX "writing_styles_user_name_unique" ON "writing_styles" USING btree ("user_id","name");
-- Retain the protections/indexes from the reviewed additive legacy migrations.
ALTER TABLE bible_relationships ADD CONSTRAINT bible_relationships_revision_check CHECK (revision > 0);
ALTER TABLE bible_relationships ADD CONSTRAINT bible_relationships_self_check CHECK (source_id <> target_id OR is_deleted);
CREATE INDEX bible_relationships_project ON bible_relationships (project_id);
CREATE INDEX bible_relationships_target ON bible_relationships (project_id, target_id);

-- PostgreSQL-backed sessions survive an app restart.
CREATE TABLE session (sid varchar NOT NULL PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL);
CREATE INDEX IDX_session_expire ON session (expire);
