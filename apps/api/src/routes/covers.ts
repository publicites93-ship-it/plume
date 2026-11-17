import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "../db/client";
import { verifyAccessToken } from "../auth/tokens";
import { readStoryCover } from "../services/covers";

const params = z.object({ storyId: z.string().uuid() });

export async function registerCoverRoutes(app: FastifyInstance, db: Database) {
  app.get("/covers/:storyId", async (request, reply) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) return reply.code(404).send({ error: "Couverture introuvable." });

    let viewerId: string | null = null;
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        viewerId = (await verifyAccessToken(header.slice(7))).sub;
      } catch {
        viewerId = null;
      }
    }

    const cover = await readStoryCover(db, parsed.data.storyId, viewerId);
    if (!cover) return reply.code(404).send({ error: "Couverture introuvable." });

    // L'URL contient ?v=<date> : une nouvelle couverture change d'adresse.
    reply
      .header("content-type", cover.mimeType)
      .header("x-content-type-options", "nosniff")
      .header(
        "cache-control",
        cover.isPrivate ? "private, max-age=86400" : "public, max-age=31536000, immutable",
      );
    return reply.send(cover.bytes);
  });
}
