import { createDatabase } from "./apps/api/src/db/client.ts";
import { sql } from "drizzle-orm";
const h = await createDatabase();
const q = async (label: string, query: string) => {
  try {
    const res = await h.db.execute(sql.raw(query));
    console.log("==", label, JSON.stringify(res.rows, null, 2));
  } catch (e) { console.log("==", label, "ERR", (e as Error).message); }
};
await q("analyses", "select id, chapter_id, skill, created_at from ai_analyses order by created_at");
await q("sessions", "select id, title, story_id, created_at from coaching_sessions order by created_at");
await q("plots", "select id, name, story_id from plot_threads order by created_at");
await q("ideas", "select id, content, story_id from story_ideas order by created_at");
await q("attempts", "select id, exercise_id, status, created_at from exercise_attempts order by created_at");
await q("events", "select id, title, story_id from timeline_events order by created_at");
await q("locations", "select id, name, story_id from locations order by created_at");
await q("stories", "select id, title, visibility, status from stories order by created_at");
await h.close();
