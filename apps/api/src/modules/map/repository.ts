import type { MapData } from '@wonderland/shared';
import { prisma } from '../../db';

export const mapRepository = {
  findByStory: (storyId: string) => prisma.storyMap.findUnique({ where: { storyId } }),

  /**
   * Salva o mapa e, na mesma transação, tira o local dos eventos que apontavam para
   * elementos que não existem mais no mapa. Retorna quantos eventos ficaram sem local.
   */
  async save(storyId: string, data: MapData, validLocationIds: string[]) {
    const [map, cleared] = await prisma.$transaction([
      prisma.storyMap.upsert({
        where: { storyId },
        create: { storyId, data },
        update: { data },
      }),
      prisma.event.updateMany({
        where: { storyId, locationId: { not: null, notIn: validLocationIds } },
        data: { locationKind: null, locationId: null },
      }),
    ]);
    return { map, clearedEvents: cleared.count };
  },
};
