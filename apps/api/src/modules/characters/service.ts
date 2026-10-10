import { NotFoundError } from '../../errors';
import { ethnicityService } from '../ethnicities/service';
import { eventRepository } from '../events/repository';
import { mapService } from '../map/service';
import { storyService } from '../stories/service';
import { listRelations, replaceRelations, type RelationInput } from './relations';
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
    await ethnicityService.assertInStory(storyId, input.ethnicityId);
    await mapService.assertLocation(storyId, input.birthLocation);
    return repo.create(storyId, input);
  },
  async update(id: string, input: CharacterUpdate) {
    const character = await get(id);
    await ethnicityService.assertInStory(character.storyId, input.ethnicityId);
    await mapService.assertLocation(character.storyId, input.birthLocation);
    return repo.update(id, input);
  },
  // Os vínculos com eventos ficam; o personagem só deixa de aparecer neles.
  async remove(id: string) {
    await get(id);
    await repo.softDelete(id);
  },
  async listRelations(id: string) {
    await get(id);
    return listRelations(id);
  },
  async replaceRelations(id: string, relations: RelationInput[]) {
    return replaceRelations(await get(id), relations);
  },
  async listEvents(id: string) {
    await get(id);
    return eventRepository.listByCharacter(id);
  },
  async restore(id: string) {
    await getDeleted(id);
    return repo.restore(id);
  },
  // Só remove de vez o que já está na lixeira (de uma história que não está na lixeira).
  async purge(id: string) {
    await getDeleted(id);
    await repo.purge(id);
  },
};

async function getDeleted(id: string) {
  const character = await repo.findDeletedById(id);
  if (!character) throw new NotFoundError('Character not in trash');
  return character;
}
