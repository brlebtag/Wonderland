import { z } from 'zod';

const title = z.string().trim().min(1).max(200);
const description = z.string().max(20000);

export const storyCreate = z.object({ title, description: description.default('') });
export const storyUpdate = z.object({ title: title.optional(), description: description.optional() });
export const idParams = z.object({ id: z.string().min(1) });

export type StoryCreate = z.infer<typeof storyCreate>;
export type StoryUpdate = z.infer<typeof storyUpdate>;
