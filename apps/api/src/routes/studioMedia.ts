import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "../db/client";
import { verifyAccessToken } from "../auth/tokens";
import { readMedia } from "../services/studio";

const params = z.object({ id: z.string().uuid() });

/** Images du studio : toujours privées, servies uniquement à l'auteur de l'histoire. */
export async function registerStudioMediaRoutes(app: FastifyInstance, db: Database) {
  app.get("/studio-media/:id", async (request, reply) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) return reply.code(404).send({ error: "Image introuvable." });
    let viewerId: string | null = null;
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        viewerId = (await verifyAccessToken(header.slice(7))).sub;
      } catch {
        viewerId = null;
      }
    }
    const media = await readMedia(db, parsed.data.id, viewerId);
    if (!media) return reply.code(404).send({ error: "Image introuvable." });
    return reply
      .header("content-type", media.mimeType)
      .header("x-content-type-options", "nosniff")
      .header("cache-control", "private, max-age=86400")
      .send(media.bytes);
  });
}
