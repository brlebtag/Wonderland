import { useMemo } from 'react';
import { listLocations, type MapLocation } from '@wonderland/shared';
import { useMap, type StoryEvent } from './api';

/**
 * Lugares do mapa da história que um evento pode referenciar.
 * `locations` é null enquanto a história não tem mapa.
 */
export function useMapLocations(storyId: string) {
  const map = useMap(storyId);
  return useMemo(() => {
    const data = map.data?.data;
    const locations = data ? listLocations(data) : null;
    const byId = new Map((locations ?? []).map((l) => [l.id, l]));
    const of = (event: Pick<StoryEvent, 'locationId'>) =>
      event.locationId ? byId.get(event.locationId) : undefined;
    return { isLoading: map.isLoading, locations, byId, of };
  }, [map.data, map.isLoading]);
}

/** Agrupa os lugares por tipo, na ordem em que aparecem (para <optgroup>). */
export function groupLocations(locations: MapLocation[]) {
  const groups = new Map<string, MapLocation[]>();
  for (const l of locations) groups.set(l.group, [...(groups.get(l.group) ?? []), l]);
  return [...groups];
}
