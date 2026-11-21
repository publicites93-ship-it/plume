import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "../../db/client";
import { claudeReservations as ledger, users } from "../../db/schema";
import { estimateCostMicros, hasModelPrice } from "../plans";

export type BudgetOwner = { db: Database; userId: string };

export async function reserveClaude({ db, userId }: BudgetOwner, model: string, prompt: string, maxOutput: number, cap: number) {
  if (!hasModelPrice(model)) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Le tarif de ce modèle Claude doit être vérifié avant utilisation." });
  // Enveloppe prudente : octets UTF-8 du message + marge système/protocole, sortie maximale.
  const reservedMicros = estimateCostMicros(model, Buffer.byteLength(prompt) + 1024, maxOutput);
  return db.transaction(async tx => {
    // Sérialise les décisions pour un compte, y compris le premier appel du mois.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const month = new Date().toISOString().slice(0, 7);
    const [spent] = await tx.select({ micros: sql<string>`coalesce(sum(coalesce(${ledger.settledMicros}, ${ledger.reservedMicros})), 0)` })
      .from(ledger).where(and(eq(ledger.userId, userId), eq(ledger.month, month)));
    if (Number(spent?.micros ?? 0) + reservedMicros > cap) throw new TRPCError({ code: "FORBIDDEN", message: "Le budget Claude disponible ce mois-ci ne suffit pas pour cet appel. Aucun crédit débité." });
    const [row] = await tx.insert(ledger).values({ userId, month, model, reservedMicros }).returning({ id: ledger.id });
    return row!.id;
  });
}

export async function settleClaude(db: Database, id: string, micros: number) {
  await db.update(ledger).set({ settledMicros: micros }).where(eq(ledger.id, id));
}
