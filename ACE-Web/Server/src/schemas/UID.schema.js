import {z} from "zod";

export const UIDSchema = z.object({
    UID: z.string().min(12).max(12),
});