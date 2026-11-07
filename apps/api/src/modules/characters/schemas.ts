import { z } from 'zod';
import {
  characterFields,
  cleanAttributes,
  cleanTags,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  type CharacterField,
} from '@wonderland/shared';
import { location } from '../events/schemas';

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
const description = z.string().trim().max(5000);

// Repetidas (sem diferenciar maiúsculas/acentos) e vazias são descartadas.
const tags = z.array(z.string().max(MAX_TAG_LENGTH * 2)).max(MAX_TAGS * 2).transform(cleanTags).pipe(z.array(z.string()).max(MAX_TAGS, `No máximo ${MAX_TAGS} tags`));

const ethnicityId = z.string().min(1).nullable();
// Local de nascimento: um elemento do mapa da história (null = não informado).
const birthLocation = location;

export const characterCreate = z.object({
  name,
  nickname: nickname.default(''),
  description: description.default(''),
  attributes: attributesSchema.default({}),
  ethnicityId: ethnicityId.default(null),
  birthLocation: birthLocation.default(null),
  tags: tags.default([]),
});
export const characterUpdate = z.object({
  name: name.optional(),
  nickname: nickname.optional(),
  description: description.optional(),
  attributes: attributesSchema.optional(),
  ethnicityId: ethnicityId.optional(),
  birthLocation: birthLocation.optional(),
  tags: tags.optional(),
});

export type CharacterCreate = z.infer<typeof characterCreate>;
export type CharacterUpdate = z.infer<typeof characterUpdate>;
