ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "feedback" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "strengths" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "improvements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "next_step" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "score" integer;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "confidence" real;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "feedback_provider" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "feedback_model" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_attempts_user_idx" ON "exercise_attempts" USING btree ("user_id","created_at");