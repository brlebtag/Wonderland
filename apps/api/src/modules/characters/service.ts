import { NotFoundError } from '../../errors';
import { eventRepository } from '../events/repository';
import { storyService } from '../stories/service';
import { characterRepository as repo } from './repository';
import type { CharacterCreate, CharacterUpdate } from './schemas';

async function get(id: string) {
  const character = await repo.findById(id);
  if (!character) throw new NotFoundError('Character not found');
  return character;
}

export const characterService = {
  async listByStory(storyId: string) {
    await storyService.get(storyId);
    return repo.listByStory(storyId);
  },
  get,
  async create(storyId: string, input: CharacterCreate) {
    await storyService.get(storyId);
    return repo.create(storyId, input);
  },
  async update(id: string, input: CharacterUpdate) {
    await get(id);
    return repo.update(id, input);
  },
  // Os vínculos com eventos ficam; o personagem só deixa de aparecer neles.
  async remove(id: string) {
    await get(id);
    await repo.softDelete(id);
  },
  async listEvents(id: string) {
    await get(id);
    return eventRepository.listByCharacter(id);
  },
};
