import { listLocations, type EventLocation, type MapData } from '@wonderland/shared';
import { BadRequestError } from '../../errors';
import { ethnicityRepository } from '../ethnicities/repository';
import { storyService } from '../stories/service';
import { mapRepository as repo } from './repository';

export const mapService = {
  async get(storyId: string) {
    await storyService.get(storyId);
    const map = await repo.findByStory(storyId);
    return { data: (map?.data as MapData | undefined) ?? null, updatedAt: map?.updatedAt ?? null };
  },

  async save(storyId: string, data: MapData) {
    await storyService.get(storyId);

    const ethnicityIds = [
      ...new Set(
        [...data.regions, ...data.territories].flatMap((e) => (e.ethnicityId ? [e.ethnicityId] : [])),
      ),
    ];
    if ((await ethnicityRepository.countInStory(storyId, ethnicityIds)) !== ethnicityIds.length) {
      throw new BadRequestError('Etnia inválida para esta história');
    }

    const { map, clearedEvents } = await repo.save(
      storyId,
      data,
      listLocations(data).map((l) => l.id),
    );
    return { data: map.data as MapData, updatedAt: map.updatedAt, clearedEvents };
  },

  /** Garante que o local existe no mapa da história (usado ao salvar eventos). */
  async assertLocation(storyId: string, location: EventLocation | null | undefined) {
    if (!location) return;
    const map = await repo.findByStory(storyId);
    const exists =
      map &&
      listLocations(map.data as MapData).some(
        (l) => l.kind === location.kind && l.id === location.id,
      );
    if (!exists) throw new BadRequestError('Local inexistente no mapa da história');
  },
};
