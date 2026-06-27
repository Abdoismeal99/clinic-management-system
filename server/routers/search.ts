import { z } from "zod";
import { linkedProcedure as protectedProcedure, router } from "../_core/trpc";
import { globalSearch, getTenantId } from "../db";

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      if (input.query.length < 2) return { patients: [], visits: [], prescriptions: [] };
      const tenantId = (await getTenantId(ctx.user.email)) ?? undefined;
      return globalSearch(input.query, tenantId);
    }),
});
