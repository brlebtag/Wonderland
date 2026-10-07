import { z } from 'zod';

const name = z.string().trim().min(1).max(200);
const kind = z.string().trim().max(100);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #rrggbb');
const description = z.string().max(20000);

export const ethnicityCreate = z.object({
  name,
  kind: kind.default(''),
  color: color.default('#8a6ad8'),
  description: description.default(''),
});
export const ethnicityUpdate = z.object({
  name: name.optional(),
  kind: kind.optional(),
  color: color.optional(),
  description: description.optional(),
});

export type EthnicityCreate = z.infer<typeof ethnicityCreate>;
export type EthnicityUpdate = z.infer<typeof ethnicityUpdate>;
