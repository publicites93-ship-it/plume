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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_token_kind') THEN
    CREATE TYPE "public"."auth_token_kind" AS ENUM('email_verification', 'password_reset');
  END IF;
END $$;--> statement-breakpoint
ALTER TYPE "public"."auth_token_kind" ADD VALUE IF NOT EXISTS 'email_verification';--> statement-breakpoint
ALTER TYPE "public"."auth_token_kind" ADD VALUE IF NOT EXISTS 'password_reset';--> statement-breakpoint
SELECT pg_temp.plume_archive_table('auth_tokens');--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "auth_token_kind" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_hash_unique" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_kind_idx" ON "auth_tokens" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "auth_tokens_expires_idx" ON "auth_tokens" USING btree ("expires_at");