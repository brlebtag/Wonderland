import { z } from 'zod';
import { characterFields, cleanAttributes, type CharacterField } from '@wonderland/shared';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD');

function fieldSchema(field: CharacterField) {
  const values = (field.options ?? []).map((o) => o.value);
  switch (field.type) {
    case 'text':
      return z.string().max(500);
    case 'textarea':
      return z.string().max(20000);
    case 'number':
      return z.number().finite().nonnegative();
    case 'date':
      return dateString;
    case 'boolean':
      return z.boolean();
    case 'select':
      return z.enum(values);
    case 'multiselect':
      return z.array(z.enum(values)).max(values.length);
  }
}

// Gerado do catálogo compartilhado. Chaves desconhecidas são descartadas e valores vazios removidos.
// Campos aceitam null/'' (= "apagar o valor"), que somem no cleanAttributes.
export const attributesSchema = z
  .object(
    Object.fromEntries(
      characterFields.map((f) => [f.key, z.union([fieldSchema(f), z.literal(''), z.null()]).optional()]),
    ),
  )
  .transform(cleanAttributes);

const name = z.string().trim().min(1).max(200);
const nickname = z.string().trim().max(200);

export const characterCreate = z.object({
  name,
  nickname: nickname.default(''),
  attributes: attributesSchema.default({}),
});
export const characterUpdate = z.object({
  name: name.optional(),
  nickname: nickname.optional(),
  attributes: attributesSchema.optional(),
});

export type CharacterCreate = z.infer<typeof characterCreate>;
export type CharacterUpdate = z.infer<typeof characterUpdate>;
