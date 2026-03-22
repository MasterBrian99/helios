import z from 'zod';
import 'dotenv/config';
const envs = z.object({
  DATABASE_URL: z.string(),
  NODE_ENV: z.string().optional(),
  PRIVATE_KEY: z.string(),
  PUBLIC_KEY: z.string(),
  JWT_EXPIRATION_TIME: z.coerce.number().default(3600),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('uploads'),
  S3_BUCKET: z.string().optional().default('bucket'),
  S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_SIGNED_URL_EXPIRES: z.coerce.number().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  CHESS_MODEL: z.enum(['stockfish', 'lc0', 'komodo']).default('stockfish'),
  CHESS_ENGINE_PATH: z.string().optional(),
  CHESS_ENGINE_DEPTH: z.coerce.number().optional(),
  ANALYSIS_ENGINE_DEPTH: z.coerce.number().optional().default(20),
  LC0_WEIGHTS_PATH: z.string().optional(),
});

export const validate = () => {
  const validated = envs.parse(process.env);

  return validated;
};
