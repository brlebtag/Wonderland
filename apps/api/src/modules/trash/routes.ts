import type { FastifyInstance } from 'fastify';
import { characterRepository } from '../characters/repository';
import { eventRepository } from '../events/repository';
import { idParams } from '../stories/schemas';
import { storyService } from '../stories/service';

/** Lixeira de uma história: eventos e personagens apagados (a história em si precisa estar viva). */
export async function trashRoutes(app: FastifyInstance) {
  app.get('/stories/:id/trash', async (req) => {
    const { id } = idParams.parse(req.params);
    await storyService.get(id);
    const [events, characters] = await Promise.all([
      eventRepository.listDeletedByStory(id),
      characterRepository.listDeletedByStory(id),
    ]);
    return { events, characters };
  });
}
