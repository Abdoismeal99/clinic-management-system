import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { globalSearch } from "../db";

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      if (input.query.length < 2) return { patients: [], visits: [], prescriptions: [] };
      return globalSearch(input.query);
    }),
});
