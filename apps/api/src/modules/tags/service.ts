import { tagKey } from '@wonderland/shared';
import { BadRequestError, NotFoundError } from '../../errors';
import { storyService } from '../stories/service';
import { tagRepository as repo } from './repository';
import type { TagInput } from './schemas';

async function get(id: string) {
  const tag = await repo.findById(id);
  if (!tag) throw new NotFoundError('Tag not found');
  return tag;
}

/** Recusa um nome que já existe na história (ignorando maiúsculas/acentos), exceto a própria tag. */
async function assertFreeName(storyId: string, name: string, selfId?: string) {
  const clash = (await repo.allInStory(storyId)).find((t) => t.id !== selfId && tagKey(t.name) === tagKey(name));
  if (clash) throw new BadRequestError(`Já existe a tag "${clash.name}"`);
}

export const tagService = {
  async listByStory(storyId: string) {
    await storyService.get(storyId);
    return repo.listByStory(storyId);
  },
  async create(storyId: string, { name }: TagInput) {
    await storyService.get(storyId);
    await assertFreeName(storyId, name);
    return repo.create(storyId, name);
  },
  async update(id: string, { name }: TagInput) {
    const tag = await get(id);
    await assertFreeName(tag.storyId, name, id);
    return repo.update(id, name);
  },
  async remove(id: string) {
    await get(id);
    await repo.delete(id);
  },

  /**
   * Ids das tags com estes nomes, criando as que ainda não existem na história
   * (usado ao salvar um personagem com tags digitadas).
   */
  async resolve(storyId: string, names: string[]) {
    const existing = new Map((await repo.allInStory(storyId)).map((t) => [tagKey(t.name), t.id]));
    const missing = names.filter((n) => !existing.has(tagKey(n)));
    for (const t of await repo.createMany(storyId, missing)) existing.set(tagKey(t.name), t.id);
    return names.map((n) => existing.get(tagKey(n))!);
  },
};
