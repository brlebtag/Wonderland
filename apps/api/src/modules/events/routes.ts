import type { FastifyInstance } from 'fastify';
import { idParams } from '../stories/schemas';
import { eventCreate, eventUpdate } from './schemas';
import { eventService } from './service';

export async function eventRoutes(app: FastifyInstance) {
  app.get('/stories/:id/events', (req) => eventService.listByStory(idParams.parse(req.params).id));

  app.post('/stories/:id/events', async (req, reply) => {
    const event = await eventService.create(
      idParams.parse(req.params).id,
      eventCreate.parse(req.body),
    );
    return reply.status(201).send(event);
  });

  app.patch('/events/:id', (req) =>
    eventService.update(idParams.parse(req.params).id, eventUpdate.parse(req.body)),
  );

  app.delete('/events/:id', async (req, reply) => {
    await eventService.remove(idParams.parse(req.params).id);
    return reply.status(204).send();
  });

  app.post('/events/:id/restore', (req) => eventService.restore(idParams.parse(req.params).id));

  app.delete('/events/:id/permanent', async (req, reply) => {
    await eventService.purge(idParams.parse(req.params).id);
    return reply.status(204).send();
  });
}
