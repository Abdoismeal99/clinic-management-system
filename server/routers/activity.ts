import { z } from "zod";
import { linkedProcedure as protectedProcedure, router } from "../_core/trpc";
import { getActivityLogs, getRecentActivities } from "../db";

export const activityRouter = router({
  list: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      entityType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return getActivityLogs({
        ...input,
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
      });
    }),

  recent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => getRecentActivities(input.limit)),
});
