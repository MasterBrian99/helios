import z from 'zod';
import 'dotenv/config';
const envs = z.object({
  DATABASE_URL: z.string(),
  NODE_ENV: z.string().optional(),
  PRIVATE_KEY: z.string(),
  PUBLIC_KEY: z.string(),
  JWT_EXPIRATION_TIME: z.coerce.number().default(3600),
});

export const validate = () => {
  const validated = envs.parse(process.env);
  return validated;
};
