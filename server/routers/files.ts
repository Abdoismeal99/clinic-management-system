import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { linkedProcedure as protectedProcedure, router } from "../_core/trpc";
import { createMedicalFile, deleteFile, getFileById, getFilesByPatient, logActivity, updateFileAnnotations } from "../db";
import { storageGet, storageGetSignedUrl, storagePut } from "../storage";

export const filesRouter = router({
  byPatient: protectedProcedure
    .input(z.object({ patientId: z.number(), category: z.string().optional() }))
    .query(async ({ input }) => {
      const files = await getFilesByPatient(input.patientId, input.category);
      // Generate presigned URLs for each file
      const filesWithUrls = await Promise.all(
        files.map(async (f) => {
          try {
            const { url } = await storageGet(f.fileKey);
            return { ...f, presignedUrl: url };
          } catch {
            return { ...f, presignedUrl: null };
          }
        })
      );
      return filesWithUrls;
    }),

  getPresignedUrl: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const file = await getFileById(input.id);
      if (!file) throw new TRPCError({ code: "NOT_FOUND" });
      const { url } = await storageGet(file.fileKey);
      return { url, file };
    }),

  getUploadUrl: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      visitId: z.number().optional(),
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number().optional(),
      category: z.enum(["lab", "xray", "mri", "ct", "ultrasound", "report", "prescription", "other"]).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ext = input.fileName.split(".").pop() ?? "bin";
      const fileKey = `medical/${input.patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      // Store metadata first
      const id = await createMedicalFile({
        patientId: input.patientId,
        visitId: input.visitId ?? null,
        uploadedBy: ctx.user.id,
        fileName: fileKey,
        originalName: input.fileName,
        fileKey,
        mimeType: input.mimeType,
        fileSize: input.fileSize ?? null,
        category: input.category ?? "other",
        description: input.description ?? null,
      });
      await logActivity({
        userId: ctx.user.id,
        action: "file_uploaded",
        entityType: "file",
        entityId: id,
        description: `File "${input.fileName}" uploaded for patient #${input.patientId}`,
      });
      return { id, fileKey };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ id: z.number(), fileKey: z.string(), fileContent: z.string(), mimeType: z.string() }))
    .mutation(async ({ input }) => {
      // Convert base64 to buffer and upload to S3
      const buffer = Buffer.from(input.fileContent, "base64");
      await storagePut(input.fileKey, buffer, input.mimeType);
      return { success: true };
    }),

  updateAnnotations: protectedProcedure
    .input(z.object({ id: z.number(), annotations: z.any() }))
    .mutation(async ({ input, ctx }) => {
      await updateFileAnnotations(input.id, input.annotations);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteFile(input.id);
      await logActivity({
        userId: ctx.user.id,
        action: "file_deleted",
        entityType: "file",
        entityId: input.id,
        description: `File #${input.id} deleted`,
      });
      return { success: true };
    }),
});
