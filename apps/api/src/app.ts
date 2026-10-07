import Fastify from 'fastify';
import { ZodError } from 'zod';
import { BadRequestError, NotFoundError } from './errors';
import { storyRoutes } from './modules/stories/routes';
import { eventRoutes } from './modules/events/routes';
import { characterRoutes } from './modules/characters/routes';

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

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

  return app;
}
