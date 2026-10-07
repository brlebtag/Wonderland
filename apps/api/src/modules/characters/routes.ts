import type { FastifyInstance } from 'fastify';
import { idParams } from '../stories/schemas';
import { characterCreate, characterUpdate } from './schemas';
import { characterService } from './service';

export async function characterRoutes(app: FastifyInstance) {
  app.get('/stories/:id/characters', (req) =>
    characterService.listByStory(idParams.parse(req.params).id),
  );

  app.post('/stories/:id/characters', async (req, reply) => {
    const character = await characterService.create(
      idParams.parse(req.params).id,
      characterCreate.parse(req.body),
    );
    return reply.status(201).send(character);
  });

  app.get('/characters/:id', (req) => characterService.get(idParams.parse(req.params).id));

  app.patch('/characters/:id', (req) =>
    characterService.update(idParams.parse(req.params).id, characterUpdate.parse(req.body)),
  );

  app.delete('/characters/:id', async (req, reply) => {
    await characterService.remove(idParams.parse(req.params).id);
    return reply.status(204).send();
  });

  app.post('/characters/:id/restore', (req) =>
    characterService.restore(idParams.parse(req.params).id),
  );

  app.delete('/characters/:id/permanent', async (req, reply) => {
    await characterService.purge(idParams.parse(req.params).id);
    return reply.status(204).send();
  });

  app.get('/characters/:id/events', (req) =>
    characterService.listEvents(idParams.parse(req.params).id),
  );
}
