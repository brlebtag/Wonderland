import {
  decodeRle,
  encodeRle,
  type MapData,
  type MapFeature,
  type MapPath,
  type MapRegion,
  type MapTerritory,
} from '@wonderland/shared';

/**
 * Mapa em memória para edição/visualização: as grades viram arrays tipados
 * (pintar = escrever no array), o resto continua como no JSON salvo.
 */
export type EditableMap = {
  width: number;
  height: number;
  terrain: Uint8Array;
  regionGrid: Uint16Array;
  regions: MapRegion[];
  features: MapFeature[];
  paths: MapPath[];
  territories: MapTerritory[];
};

export function fromData(data: MapData): EditableMap {
  const cells = data.width * data.height;
  return {
    width: data.width,
    height: data.height,
    terrain: decodeRle(data.terrain, new Uint8Array(cells)),
    regionGrid: decodeRle(data.regionGrid, new Uint16Array(cells)),
    regions: data.regions,
    features: data.features,
    paths: data.paths,
    territories: data.territories,
  };
}

export function toData(map: EditableMap): MapData {
  return {
    version: 1,
    width: map.width,
    height: map.height,
    terrain: encodeRle(map.terrain),
    regionGrid: encodeRle(map.regionGrid),
    regions: map.regions,
    features: map.features,
    paths: map.paths,
    territories: map.territories,
  };
}

/** Cópia para o desfazer (as grades são mutadas ao pintar; o resto é imutável). */
export const cloneMap = (map: EditableMap): EditableMap => ({
  ...map,
  terrain: map.terrain.slice(),
  regionGrid: map.regionGrid.slice(),
});

export const newId = () => crypto.randomUUID();

export const REGION_PALETTE = [
  '#d9534f', '#5b8def', '#46a86b', '#e0a030', '#9b59b6', '#16a2a2',
  '#e67e22', '#c0398f', '#7f8c3a', '#3f5fa8', '#b5651d', '#2e8b57',
];

/** Cor estável e distinta por índice (personagens no mapa). */
export const CHARACTER_PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4',
  '#f032e6', '#9a6324', '#469990', '#800000', '#808000', '#000075',
];
