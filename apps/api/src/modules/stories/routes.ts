import type { FastifyInstance } from 'fastify';
import { idParams, storyCreate, storyUpdate } from './schemas';
import { storyService } from './service';

export async function storyRoutes(app: FastifyInstance) {
  app.get('/stories', () => storyService.list());

  app.post('/stories', async (req, reply) => {
    const story = await storyService.create(storyCreate.parse(req.body));
    return reply.status(201).send(story);
  });

  app.get('/stories/:id', (req) => storyService.get(idParams.parse(req.params).id));

  app.patch('/stories/:id', (req) =>
    storyService.update(idParams.parse(req.params).id, storyUpdate.parse(req.body)),
  );

  app.delete('/stories/:id', async (req, reply) => {
    await storyService.remove(idParams.parse(req.params).id);
    return reply.status(204).send();
  });

  app.post('/stories/:id/restore', (req) => storyService.restore(idParams.parse(req.params).id));
}
