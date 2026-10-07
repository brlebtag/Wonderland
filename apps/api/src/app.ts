import Fastify from 'fastify';
import { ZodError } from 'zod';
import { BadRequestError, NotFoundError } from './errors';
import { storyRoutes } from './modules/stories/routes';
import { eventRoutes } from './modules/events/routes';
import { characterRoutes } from './modules/characters/routes';
import { trashRoutes } from './modules/trash/routes';
import { ethnicityRoutes } from './modules/ethnicities/routes';
import { mapRoutes } from './modules/map/routes';

export function buildApp() {
  // O mapa é salvo como um documento só; 20 MB dá folga para mapas grandes.
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test', bodyLimit: 20 * 1024 * 1024 });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: 'ValidationError', issues: err.issues });
    }
    if (err instanceof BadRequestError) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
    if (err instanceof NotFoundError) {
      return reply.status(404).send({ error: 'NotFound', message: err.message });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    return reply
      .status(status)
      .send({ error: status >= 500 ? 'InternalServerError' : (err as Error).message });
  });

  app.register(storyRoutes, { prefix: '/api' });
  app.register(eventRoutes, { prefix: '/api' });
  app.register(characterRoutes, { prefix: '/api' });
  app.register(trashRoutes, { prefix: '/api' });
  app.register(ethnicityRoutes, { prefix: '/api' });
  app.register(mapRoutes, { prefix: '/api' });

  return app;
}
