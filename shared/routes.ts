import { z } from 'zod';
import { registerIdentitySchema, verifyIdentityResponseSchema, verifyIdentitySchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  identities: {
    register: {
      method: 'POST' as const,
      path: '/api/identities' as const,
      input: registerIdentitySchema,
      responses: {
        201: z.object({ message: z.string(), id: z.number() }),
        400: errorSchemas.validation,
      },
    },
  },
  verification: {
    verify: {
      method: 'POST' as const,
      path: '/api/verify' as const,
      input: verifyIdentitySchema,
      responses: {
        200: verifyIdentityResponseSchema,
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
