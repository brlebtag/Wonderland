import { z } from 'zod';
import {
  decodeRle,
  FEATURE_TYPES,
  MAX_SIZE,
  MIN_SIZE,
  PATH_TYPES,
  TERRAIN_TYPES,
  type MapData,
} from '@wonderland/shared';

const coord = z.number().finite().min(-10000).max(10000);
const point = z.tuple([coord, coord]);
const elementId = z.string().min(1).max(64);
const name = z.string().max(200);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const ethnicityId = z.string().min(1).nullable();
const size = z.number().min(MIN_SIZE).max(MAX_SIZE).optional();

const region = z.object({
  id: elementId,
  code: z.number().int().min(1).max(65535),
  name,
  color,
  ethnicityId,
});

const feature = z.object({
  id: elementId,
  type: z.enum(FEATURE_TYPES.map((f) => f.value)),
  name,
  x: coord,
  y: coord,
  size,
});

const path = z.object({
  id: elementId,
  type: z.enum(PATH_TYPES.map((p) => p.value)),
  name,
  points: z.array(point).min(2).max(5000),
  size,
});

const shape = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circle'), cx: coord, cy: coord, r: z.number().positive().max(10000) }),
  z.object({ kind: z.literal('polygon'), points: z.array(point).min(3).max(5000) }),
]);

const territory = z.object({ id: elementId, name, ethnicityId, shape });

const MAX_TERRAIN = Math.max(...TERRAIN_TYPES.map((t) => t.code));

export const mapDataSchema = z
  .object({
    version: z.literal(1),
    width: z.number().int().min(10).max(1000),
    height: z.number().int().min(10).max(1000),
    terrain: z.string().max(10_000_000),
    regionGrid: z.string().max(10_000_000),
    regions: z.array(region).max(5000),
    features: z.array(feature).max(20000),
    paths: z.array(path).max(5000),
    territories: z.array(territory).max(5000),
  })
  .superRefine((map, ctx) => {
    const cells = map.width * map.height;
    const issue = (message: string, path: string) => ctx.addIssue({ code: 'custom', message, path: [path] });

    try {
      const terrain = decodeRle(map.terrain, new Uint8Array(cells));
      if (terrain.some((v) => v > MAX_TERRAIN)) issue('Tipo de terreno inválido', 'terrain');
    } catch (e) {
      issue((e as Error).message, 'terrain');
    }
    try {
      const codes = new Set(map.regions.map((r) => r.code));
      const grid = decodeRle(map.regionGrid, new Uint16Array(cells));
      if (grid.some((v) => v !== 0 && !codes.has(v))) issue('Célula com região inexistente', 'regionGrid');
    } catch (e) {
      issue((e as Error).message, 'regionGrid');
    }

    const ids = [map.regions, map.features, map.paths, map.territories].flat().map((e) => e.id);
    if (new Set(ids).size !== ids.length) issue('Ids de elementos repetidos', 'id');
    const codes = map.regions.map((r) => r.code);
    if (new Set(codes).size !== codes.length) issue('Códigos de região repetidos', 'regions');
  })
  .transform((map) => map as MapData);

export const mapSave = z.object({ data: mapDataSchema });
