import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { billingStatus, createCheckout, createPortal } from "../../services/billing";

export const billingRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => billingStatus(ctx.db, ctx.userId)),

  checkout: protectedProcedure
    .input(z.object({ plan: z.enum(["plus", "premium"]) }))
    .mutation(async ({ ctx, input }) => createCheckout(ctx.db, ctx.userId, input.plan)),

  portal: protectedProcedure.mutation(async ({ ctx }) => createPortal(ctx.db, ctx.userId)),
});
