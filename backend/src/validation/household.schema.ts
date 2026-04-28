import z from "zod";

export const householdSchema = z.object({
    name: z.string().min(3).max(20)
})

export const joinSchema = z.object({
  inviteCode: z
    .string()
    .length(6)
    .regex(/^[a-zA-Z0-9]+$/, "Only letters and numbers allowed")
    .transform((val) => val.toUpperCase()),
});