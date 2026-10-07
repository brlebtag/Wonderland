import { z } from 'zod';

const title = z.string().trim().min(1).max(200);
const description = z.string().max(20000);

// Recebe "YYYY-MM-DD" e guarda como meia-noite UTC.
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD')
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), 'Data inválida');

// Personagens vinculados ao evento (substitui a lista inteira).
const characterIds = z
  .array(z.string().min(1))
  .max(500)
  .transform((ids) => [...new Set(ids)]);

// Lugar no mapa da história (null = sem local).
const location = z
  .object({ kind: z.enum(['feature', 'region', 'territory']), id: z.string().min(1).max(64) })
  .nullable();

export const eventCreate = z.object({
  title,
  description: description.default(''),
  date,
  characterIds: characterIds.default([]),
  location: location.default(null),
});
export const eventUpdate = z.object({
  title: title.optional(),
  description: description.optional(),
  date: date.optional(),
  characterIds: characterIds.optional(),
  location: location.optional(),
});

export type EventCreate = z.infer<typeof eventCreate>;
export type EventUpdate = z.infer<typeof eventUpdate>;
