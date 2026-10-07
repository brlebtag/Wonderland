import { NotFoundError } from '../../errors';
import { storyRepository as repo } from './repository';
import type { StoryCreate, StoryUpdate } from './schemas';

async function get(id: string) {
  const story = await repo.findById(id);
  if (!story) throw new NotFoundError('Story not found');
  return story;
}

export const storyService = {
  list: () => repo.list(),
  get,
  create: (input: StoryCreate) => repo.create(input),
  async update(id: string, input: StoryUpdate) {
    await get(id);
    return repo.update(id, input);
  },
  // Os eventos não são tocados: ficam ocultos enquanto a história estiver apagada.
  async remove(id: string) {
    await get(id);
    await repo.softDelete(id);
  },
  async restore(id: string) {
    await getDeleted(id);
    return repo.restore(id);
  },
  listDeleted: () => repo.listDeleted(),
  // Só remove de vez o que já está na lixeira.
  async purge(id: string) {
    await getDeleted(id);
    await repo.purge(id);
  },
};

async function getDeleted(id: string) {
  const story = await repo.findDeletedById(id);
  if (!story) throw new NotFoundError('Story not in trash');
  return story;
}
