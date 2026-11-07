import { z } from 'zod';
import { cleanTag, MAX_TAG_LENGTH } from '@wonderland/shared';

const name = z.string().max(MAX_TAG_LENGTH * 2).transform(cleanTag).pipe(z.string().min(1, 'Informe o nome da tag'));

export const tagCreate = z.object({ name });
export const tagUpdate = z.object({ name });

export type TagInput = z.infer<typeof tagCreate>;
