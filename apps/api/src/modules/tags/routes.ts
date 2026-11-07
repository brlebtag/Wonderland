import type { FastifyInstance } from 'fastify';
import { idParams } from '../stories/schemas';
import { tagCreate, tagUpdate } from './schemas';
import { tagService } from './service';

export async function tagRoutes(app: FastifyInstance) {
  app.get('/stories/:id/tags', (req) => tagService.listByStory(idParams.parse(req.params).id));

  app.post('/stories/:id/tags', async (req, reply) => {
    const tag = await tagService.create(idParams.parse(req.params).id, tagCreate.parse(req.body));
    return reply.status(201).send(tag);
  });

  app.patch('/tags/:id', (req) => tagService.update(idParams.parse(req.params).id, tagUpdate.parse(req.body)));

  // Apaga de vez (sem lixeira): os personagens só perdem a tag.
  app.delete('/tags/:id', async (req, reply) => {
    await tagService.remove(idParams.parse(req.params).id);
    return reply.status(204).send();
  });
}
