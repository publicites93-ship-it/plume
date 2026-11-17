CREATE TABLE IF NOT EXISTS "character_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"from_character_id" uuid NOT NULL,
	"to_character_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"description" text,
	"origin" text DEFAULT 'author' NOT NULL,
	"source_chapter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "sheet" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "sheet" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "plot_threads" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'secondary' NOT NULL;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD COLUMN IF NOT EXISTS "certainty" text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_from_character_id_characters_id_fk" FOREIGN KEY ("from_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_to_character_id_characters_id_fk" FOREIGN KEY ("to_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_source_chapter_id_chapters_id_fk" FOREIGN KEY ("source_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "studio_media" ADD CONSTRAINT "studio_media_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "character_relations_story_idx" ON "character_relations" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "character_relations_unique" ON "character_relations" USING btree ("from_character_id","to_character_id","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_media_entity_idx" ON "studio_media" USING btree ("entity_type","entity_id","created_at");