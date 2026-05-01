import z from "zod";

export const createItemSchema = z.object({
    name: z.string(),
    category: z.enum(["produce", "dairy", "meat", "pantry", "frozen", "other"]).default("other"),
    quantity: z.number().positive().default(1),
    expiryDate: z.date(),
})

export const getItemSchema = z.object({
    status: z.enum(["fresh", "expiring-soon", "used", "expired", "wasted"]).optional(),
    category: z.enum(["produce", "dairy", "meat", "pantry", "frozen", "other"]).optional()
})

export const updateItemSchema = z.object({
    name: z.string().optional(),
    category: z.enum(["produce", "dairy", "meat", "pantry", "frozen", "other"]).optional(),
    quantity: z.number().positive().optional(),
    expiryDate: z.date().optional(),
})

export const patchItemSchema = z.object({
    status: z.enum(["used", "wasted"])
})