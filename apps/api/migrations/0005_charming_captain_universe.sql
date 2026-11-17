ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "customer_ref" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_ref_unique" ON "subscriptions" USING btree ("provider","provider_ref");