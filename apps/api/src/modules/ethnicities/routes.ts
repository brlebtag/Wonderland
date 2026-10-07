import type { FastifyInstance } from 'fastify';
import { idParams } from '../stories/schemas';
import { ethnicityCreate, ethnicityUpdate } from './schemas';
import { ethnicityService } from './service';

export async function ethnicityRoutes(app: FastifyInstance) {
  app.get('/stories/:id/ethnicities', (req) =>
    ethnicityService.listByStory(idParams.parse(req.params).id),
  );

  app.post('/stories/:id/ethnicities', async (req, reply) => {
    const ethnicity = await ethnicityService.create(
      idParams.parse(req.params).id,
      ethnicityCreate.parse(req.body),
    );
    return reply.status(201).send(ethnicity);
  });

  app.get('/ethnicities/:id', (req) => ethnicityService.get(idParams.parse(req.params).id));

  app.patch('/ethnicities/:id', (req) =>
    ethnicityService.update(idParams.parse(req.params).id, ethnicityUpdate.parse(req.body)),
  );

  app.delete('/ethnicities/:id', async (req, reply) => {
    await ethnicityService.remove(idParams.parse(req.params).id);
    return reply.status(204).send();
  });

  app.post('/ethnicities/:id/restore', (req) =>
    ethnicityService.restore(idParams.parse(req.params).id),
  );

  app.delete('/ethnicities/:id/permanent', async (req, reply) => {
    await ethnicityService.purge(idParams.parse(req.params).id);
    return reply.status(204).send();
  });
}
