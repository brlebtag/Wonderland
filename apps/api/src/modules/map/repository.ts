import type { MapData } from '@wonderland/shared';
import { prisma } from '../../db';

export const mapRepository = {
  findByStory: (storyId: string) => prisma.storyMap.findUnique({ where: { storyId } }),

  /**
   * Salva o mapa e, na mesma transação, tira o local dos eventos (e o local de nascimento
   * dos personagens) que apontavam para elementos que não existem mais no mapa.
   * Retorna quantos eventos e personagens ficaram sem local.
   */
  async save(storyId: string, data: MapData, validLocationIds: string[]) {
    const [map, cleared, clearedBirth] = await prisma.$transaction([
      prisma.storyMap.upsert({
        where: { storyId },
        create: { storyId, data },
        update: { data },
      }),
      prisma.event.updateMany({
        where: { storyId, locationId: { not: null, notIn: validLocationIds } },
        data: { locationKind: null, locationId: null },
      }),
      prisma.character.updateMany({
        where: { storyId, birthLocationId: { not: null, notIn: validLocationIds } },
        data: { birthLocationKind: null, birthLocationId: null },
      }),
    ]);
    return { map, clearedEvents: cleared.count, clearedCharacters: clearedBirth.count };
  },
};
