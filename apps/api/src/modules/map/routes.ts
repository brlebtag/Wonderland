import type { FastifyInstance } from 'fastify';
import { idParams } from '../stories/schemas';
import { mapSave } from './schemas';
import { mapService } from './service';

export async function mapRoutes(app: FastifyInstance) {
  /** `data` é null enquanto a história ainda não tem mapa. */
  app.get('/stories/:id/map', (req) => mapService.get(idParams.parse(req.params).id));

  app.put('/stories/:id/map', (req) =>
    mapService.save(idParams.parse(req.params).id, mapSave.parse(req.body).data),
  );
}
