ALTER TABLE "exercise_attempts" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "strengths" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "improvements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "next_step" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "feedback_provider" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "feedback_model" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "exercise_attempts_user_idx" ON "exercise_attempts" USING btree ("user_id","created_at");