// Mapa de uma história. É salvo como um único documento JSON (StoryMap.data).
//
// - O "chão" é uma grade de células pintada como num editor de pixels:
//     terrain   → mar / terra / lago de cada célula
//     regionGrid → código da região de cada célula (0 = sem região)
//   As duas grades são guardadas em RLE ("valor*quantidade,...") para ficarem pequenas.
// - Por cima da grade ficam elementos vetoriais, em coordenadas de célula (podem ser fracionárias):
//     features    → marcadores (cidade, vulcão...) e rótulos de texto
//     paths       → linhas (rios, estradas)
//     territories → áreas de etnias que ignoram as fronteiras (círculo ou polígono tracejado)

export type Point = [number, number];

export const TERRAIN_TYPES = [
  { code: 0, key: 'sea', label: 'Mar', color: '#9cc3de' },
  { code: 1, key: 'land', label: 'Terra', color: '#e6d9b0' },
  { code: 2, key: 'lake', label: 'Lago', color: '#6fa8d3' },
] as const;
export const SEA = 0;
export const LAND = 1;
export const LAKE = 2;

export const FEATURE_TYPES = [
  { value: 'city', label: 'Cidade', icon: '🏛️' },
  { value: 'village', label: 'Vilarejo', icon: '🏘️' },
  { value: 'castle', label: 'Castelo', icon: '🏰' },
  { value: 'port', label: 'Porto', icon: '⚓' },
  { value: 'temple', label: 'Templo', icon: '🛕' },
  { value: 'ruin', label: 'Ruína', icon: '🏚️' },
  { value: 'volcano', label: 'Vulcão', icon: '🌋' },
  { value: 'mountain', label: 'Montanha', icon: '⛰️' },
  { value: 'forest', label: 'Floresta', icon: '🌲' },
  { value: 'cave', label: 'Caverna', icon: '🕳️' },
  { value: 'landmark', label: 'Local', icon: '📍' },
  { value: 'label', label: 'Rótulo (só texto)', icon: '' },
] as const;
export type FeatureType = (typeof FEATURE_TYPES)[number]['value'];

export const PATH_TYPES = [
  { value: 'river', label: 'Rio', color: '#3f86c4', width: 0.8, dash: '' },
  { value: 'road', label: 'Estrada', color: '#8a6a45', width: 0.6, dash: '2 1.2' },
] as const;
export type PathType = (typeof PATH_TYPES)[number]['value'];

export type MapFeature = { id: string; type: FeatureType; name: string; x: number; y: number };
export type MapPath = { id: string; type: PathType; name: string; points: Point[] };
export type MapRegion = {
  id: string;
  /** Valor gravado na regionGrid (1..65535). */
  code: number;
  name: string;
  color: string;
  ethnicityId: string | null;
};
export type TerritoryShape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'polygon'; points: Point[] };
export type MapTerritory = {
  id: string;
  name: string;
  ethnicityId: string | null;
  shape: TerritoryShape;
};

export type MapData = {
  version: 1;
  width: number;
  height: number;
  terrain: string;
  regionGrid: string;
  regions: MapRegion[];
  features: MapFeature[];
  paths: MapPath[];
  territories: MapTerritory[];
};

/** Lugar do mapa referenciado por um evento. */
export type LocationKind = 'feature' | 'region' | 'territory';
export type EventLocation = { kind: LocationKind; id: string };

// ---------- RLE ----------

export function encodeRle(values: ArrayLike<number>): string {
  const parts: string[] = [];
  let i = 0;
  while (i < values.length) {
    const v = values[i];
    let n = 1;
    while (i + n < values.length && values[i + n] === v) n++;
    parts.push(`${v}*${n}`);
    i += n;
  }
  return parts.join(',');
}

/** Decodifica RLE; lança erro se o tamanho não bater ou houver valor inválido. */
export function decodeRle<T extends Uint8Array | Uint16Array>(rle: string, out: T): T {
  let i = 0;
  if (rle !== '') {
    for (const part of rle.split(',')) {
      const [v, n] = part.split('*').map(Number);
      if (!Number.isInteger(v) || !Number.isInteger(n) || v < 0 || n < 1 || i + n > out.length) {
        throw new Error('RLE inválido');
      }
      out.fill(v, i, i + n);
      i += n;
    }
  }
  if (i !== out.length) throw new Error('RLE com tamanho diferente do mapa');
  return out;
}

export function createEmptyMap(width = 240, height = 150): MapData {
  const cells = width * height;
  return {
    version: 1,
    width,
    height,
    terrain: `${SEA}*${cells}`,
    regionGrid: `0*${cells}`,
    regions: [],
    features: [],
    paths: [],
    territories: [],
  };
}

// ---------- geometria ----------

/** Ponto representativo de cada região: a célula da região mais próxima do seu centroide. */
export function regionAnchors(width: number, grid: Uint16Array): Map<number, { x: number; y: number }> {
  const sums = new Map<number, { x: number; y: number; n: number }>();
  for (let i = 0; i < grid.length; i++) {
    const code = grid[i];
    if (!code) continue;
    const s = sums.get(code) ?? { x: 0, y: 0, n: 0 };
    s.x += (i % width) + 0.5;
    s.y += Math.floor(i / width) + 0.5;
    s.n++;
    sums.set(code, s);
  }
  const best = new Map<number, { x: number; y: number; d: number }>();
  for (let i = 0; i < grid.length; i++) {
    const code = grid[i];
    if (!code) continue;
    const s = sums.get(code)!;
    const x = (i % width) + 0.5;
    const y = Math.floor(i / width) + 0.5;
    const d = (x - s.x / s.n) ** 2 + (y - s.y / s.n) ** 2;
    const b = best.get(code);
    if (!b || d < b.d) best.set(code, { x, y, d });
  }
  return new Map([...best].map(([code, { x, y }]) => [code, { x, y }]));
}

export function territoryCenter(shape: TerritoryShape) {
  if (shape.kind === 'circle') return { x: shape.cx, y: shape.cy };
  const n = shape.points.length;
  return {
    x: shape.points.reduce((s, p) => s + p[0], 0) / n,
    y: shape.points.reduce((s, p) => s + p[1], 0) / n,
  };
}

export type MapLocation = EventLocation & { name: string; group: string; x: number; y: number };

/** Todos os lugares que um evento pode referenciar, com o ponto usado para posicioná-lo. */
export function listLocations(map: MapData): MapLocation[] {
  const grid = decodeRle(map.regionGrid, new Uint16Array(map.width * map.height));
  const anchors = regionAnchors(map.width, grid);
  const featureLabel = (t: string) => FEATURE_TYPES.find((f) => f.value === t)?.label ?? t;

  return [
    ...map.features.map((f) => ({
      kind: 'feature' as const,
      id: f.id,
      name: f.name || featureLabel(f.type),
      group: featureLabel(f.type),
      x: f.x,
      y: f.y,
    })),
    ...map.regions.flatMap((r) => {
      const a = anchors.get(r.code);
      return a ? [{ kind: 'region' as const, id: r.id, name: r.name, group: 'Região', ...a }] : [];
    }),
    ...map.territories.map((t) => ({
      kind: 'territory' as const,
      id: t.id,
      name: t.name,
      group: 'Território',
      ...territoryCenter(t.shape),
    })),
  ];
}

// ---------- deslocamento dos personagens ----------

export type Stop = { t: number; x: number; y: number; eventId: string };

/**
 * Posição de um personagem no instante `t` (em dias), dadas as paradas (eventos com local)
 * em ordem cronológica. Antes da primeira parada o personagem ainda não apareceu (null);
 * entre duas paradas anda em linha reta, proporcional ao tempo; depois da última fica parado.
 */
export function positionAt(stops: Stop[], t: number) {
  if (stops.length === 0 || t < stops[0].t) return null;
  for (let i = stops.length - 1; i >= 0; i--) {
    const a = stops[i];
    if (t < a.t) continue;
    const b = stops[i + 1];
    if (!b || b.t === a.t) return { x: a.x, y: a.y, moving: false, from: a, to: undefined };
    const k = (t - a.t) / (b.t - a.t);
    const moving = a.x !== b.x || a.y !== b.y;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, moving, from: a, to: b };
  }
  return null;
}
