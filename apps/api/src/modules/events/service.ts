import { BadRequestError, NotFoundError } from '../../errors';
import { characterRepository } from '../characters/repository';
import { mapService } from '../map/service';
import { storyService } from '../stories/service';
import { eventRepository as repo } from './repository';
import type { EventCreate, EventUpdate } from './schemas';

async function get(id: string) {
  const event = await repo.findById(id);
  if (!event) throw new NotFoundError('Event not found');
  return event;
}

/** Garante que todos os personagens existem e pertencem à mesma história do evento. */
async function assertCharacters(storyId: string, ids: string[] | undefined) {
  if (!ids?.length) return;
  const found = await characterRepository.countInStory(storyId, ids);
  if (found !== ids.length) throw new BadRequestError('Personagem inválido para esta história');
}

export const eventService = {
  async listByStory(storyId: string) {
    await storyService.get(storyId);
    return repo.listByStory(storyId);
  },
  async create(storyId: string, input: EventCreate) {
    await storyService.get(storyId);
    await assertCharacters(storyId, input.characterIds);
    await mapService.assertLocation(storyId, input.location);
    return repo.create(storyId, input);
  },
  async update(id: string, input: EventUpdate) {
    const event = await get(id);
    await assertCharacters(event.storyId, input.characterIds);
    await mapService.assertLocation(event.storyId, input.location);
    return repo.update(id, input);
  },
  async remove(id: string) {
    await get(id);
    await repo.softDelete(id);
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
  const event = await repo.findDeletedById(id);
  if (!event) throw new NotFoundError('Event not in trash');
  return event;
}
