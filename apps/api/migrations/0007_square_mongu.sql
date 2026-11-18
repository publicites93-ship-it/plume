CREATE TABLE IF NOT EXISTS "chapter_analysis_state" (
	"chapter_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"content_hash" text,
	"status" text DEFAULT 'idle' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"analyzed_at" timestamp with time zone,
	"model" text,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_limits" (
	"plan" text NOT NULL,
	"feature" text NOT NULL,
	"monthly_limit" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_limits_plan_feature_pk" PRIMARY KEY("plan","feature")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"current_value" text,
	"proposed_value" text NOT NULL,
	"source_chapter_id" uuid,
	"source_quote" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "character_relations" ADD COLUMN IF NOT EXISTS "source_quote" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "origin" text DEFAULT 'author' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "sources" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "origin" text DEFAULT 'author' NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "sources" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD COLUMN IF NOT EXISTS "origin" text DEFAULT 'author' NOT NULL;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD COLUMN IF NOT EXISTS "source_quote" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chapter_analysis_state" ADD CONSTRAINT "chapter_analysis_state_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chapter_analysis_state" ADD CONSTRAINT "chapter_analysis_state_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "studio_proposals" ADD CONSTRAINT "studio_proposals_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "studio_proposals" ADD CONSTRAINT "studio_proposals_source_chapter_id_chapters_id_fk" FOREIGN KEY ("source_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapter_analysis_story_idx" ON "chapter_analysis_state" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_proposals_story_idx" ON "studio_proposals" USING btree ("story_id","status");