CREATE TABLE IF NOT EXISTS "story_covers" (
	"story_id" uuid PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"byte_size" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "story_covers" ADD CONSTRAINT "story_covers_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;