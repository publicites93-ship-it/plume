-- Si une table du même nom existe déjà (créée par une autre version de l'API),
-- elle est renommée avec ses index au lieu d'être supprimée : aucune donnée n'est perdue.
CREATE OR REPLACE FUNCTION pg_temp.plume_archive_table(target text) RETURNS void AS $$
DECLARE
  suffix text := '_legacy_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  idx record;
BEGIN
  IF to_regclass('public.' || quote_ident(target)) IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE public.%I RENAME TO %I', target, target || suffix);
  FOR idx IN
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = target || suffix
  LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', idx.indexname, left(idx.indexname || suffix, 63));
  END LOOP;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
SELECT pg_temp.plume_archive_table('chapter_likes');--> statement-breakpoint
SELECT pg_temp.plume_archive_table('story_reactions');--> statement-breakpoint
CREATE TABLE "chapter_likes" (
	"chapter_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_likes_chapter_id_user_id_pk" PRIMARY KEY("chapter_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_likes" ADD CONSTRAINT "chapter_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_likes_story_idx" ON "chapter_likes" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_reactions_unique" ON "story_reactions" USING btree ("story_id","user_id","kind");--> statement-breakpoint
CREATE INDEX "story_reactions_story_idx" ON "story_reactions" USING btree ("story_id","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_chapter_idx" ON "comments" USING btree ("chapter_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reading_progress_story_idx" ON "reading_progress" USING btree ("story_id");