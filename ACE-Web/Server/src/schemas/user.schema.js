import {z} from "zod";

export const userRegistrationSchema = z.object({
    mail: z.string().email(),
    password: z.string().min(8),
    role:z.enum(['user', 'admin'])
});



export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
