import { publicProcedure, router } from "./trpc";
import { authRouter } from "./routers/auth";
import { storyRouter } from "./routers/stories";
import { narrativeRouter } from "./routers/narrative";
import { readingRouter } from "./routers/reading";
import { aiRouter } from "./routers/ai";
import { learningRouter } from "./routers/learning";
import { billingRouter } from "./routers/billing";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    service: "plume-api",
    time: new Date().toISOString(),
  })),
  auth: authRouter,
  stories: storyRouter,
  narrative: narrativeRouter,
  reading: readingRouter,
  ai: aiRouter,
  learning: learningRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
