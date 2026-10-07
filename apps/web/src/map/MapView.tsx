import { useEffect, useMemo, useRef, type PointerEvent, type ReactNode, type Ref } from 'react';
import {
  FEATURE_TYPES,
  PATH_TYPES,
  pathMidpoint,
  samplePath,
  territoryCenter,
  type MapFeature,
  type MapPath,
} from '@wonderland/shared';
import type { Ethnicity } from '../api';
import type { EditableMap } from './mapDoc';
import { renderGrid } from './renderGrid';

/** Pixels por célula com zoom 1. */
export const CELL_PX = 4;

export type MapSelection = { kind: 'feature' | 'path' | 'territory'; id: string };
export type RegionColorMode = 'region' | 'ethnicity';
export const parseColorMode = (raw: string): RegionColorMode | undefined =>
  raw === 'region' || raw === 'ethnicity' ? raw : undefined;
/** No modo "por etnia", regiões sem etnia (ou com etnia na lixeira) ficam cinza — nunca em branco. */
export const NO_ETHNICITY_COLOR = '#9a9a9a';

type Props = {
  map: EditableMap;
  /** Incrementado a cada pincelada (as grades são mutadas no lugar). */
  gridVersion: number;
  zoom: number;
  regionColorMode: RegionColorMode;
  ethnicities: Ethnicity[];
  selected?: MapSelection | null;
  /** Se definido, marcadores/linhas/territórios ficam clicáveis (modo seleção do editor). */
  onElementPointerDown?: (selection: MapSelection, e: PointerEvent) => void;
  svgRef?: Ref<SVGSVGElement>;
  svgHandlers?: {
    onPointerDown?: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerMove?: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerUp?: (e: PointerEvent<SVGSVGElement>) => void;
    onPointerLeave?: (e: PointerEvent<SVGSVGElement>) => void;
    onDoubleClick?: () => void;
  };
  cursor?: string;
  /** Camadas extras por cima (rascunhos do editor, personagens na timeline...). */
  children?: ReactNode;
};

const featureIcon = (type: string) => FEATURE_TYPES.find((f) => f.value === type)?.icon ?? '📍';
const pathStyle = (type: string) => PATH_TYPES.find((p) => p.value === type) ?? PATH_TYPES[0];

/** Pseudoaleatório estável (mesma cordilheira = mesmas montanhas a cada render). */
const noise = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Uma montanha: base em (x, base), pico `h` acima, meia-largura `w`. */
function Peak({ x, base, h, w }: { x: number; base: number; h: number; w: number }) {
  return (
    <g>
      <path d={`M${x - w},${base} L${x},${base - h} L${x + w},${base} Z`} className="peak" />
      {/* lado na sombra */}
      <path d={`M${x},${base - h} L${x + w},${base} L${x + w * 0.25},${base} Z`} className="shade" />
    </g>
  );
}

/** Marcador "Cordilheira": um grupo fixo de montanhas centrado em (x, y). */
const RANGE_PEAKS = [
  { dx: -3.0, db: 0.2, h: 2.4, w: 1.5 },
  { dx: 2.7, db: 0.3, h: 2.3, w: 1.4 },
  { dx: -1.3, db: -0.2, h: 3.6, w: 1.9 },
  { dx: 0.8, db: 0, h: 3.0, w: 1.7 },
  { dx: -0.2, db: 0.9, h: 1.9, w: 1.3 },
];
function RangeMarker({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g className="mountains">
      {RANGE_PEAKS.map((p, i) => (
        <Peak key={i} x={x + p.dx * size} base={y + (1.4 + p.db) * size} h={p.h * size} w={p.w * size} />
      ))}
    </g>
  );
}

/** Meia-largura/meia-altura (em células) do desenho de um marcador — usado pelas alças de redimensionar. */
export function featureExtent(f: MapFeature) {
  const s = f.size ?? 1;
  if (f.type === 'label') {
    const font = 4 * s;
    return { ex: Math.max(2, (f.name || 'Rótulo').length * font * 0.28), ey: font * 0.6 };
  }
  if (f.type === 'range') return { ex: 4.8 * s, ey: 2.6 * s };
  return { ex: 3 * s, ey: 3 * s };
}

/**
 * Montanhas espalhadas ao longo da linha da cordilheira, com variação de altura,
 * largura e um leve desvio para os lados. Desenhadas de trás para a frente (por y).
 */
function Mountains({ path }: { path: MapPath }) {
  const s = path.size ?? 1;
  const peaks = samplePath(path.points, 3 * s)
    .map((p, i) => {
      const h = (3.2 + noise(i + 1) * 1.8) * s;
      const w = (1.8 + noise(i + 7) * 0.8) * s;
      // desvio perpendicular à linha
      const off = (noise(i + 13) - 0.5) * 1.6 * s;
      const x = p.x - Math.sin(p.angle) * off;
      const base = p.y + Math.cos(p.angle) * off + h / 2;
      return { x, base, h, w };
    })
    .sort((a, b) => a.base - b.base);
  return (
    <g className="mountains">
      {peaks.map((m, i) => (
        <Peak key={i} {...m} />
      ))}
    </g>
  );
}

export function MapView({
  map,
  gridVersion,
  zoom,
  regionColorMode,
  ethnicities,
  selected,
  onElementPointerDown,
  svgRef,
  svgHandlers,
  cursor,
  children,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ethnicityColor = useMemo(
    () => new Map(ethnicities.map((e) => [e.id, e.color])),
    [ethnicities],
  );

  const regionColors = useMemo(() => {
    const colors = new Map<number, string>();
    for (const r of map.regions) {
      const color =
        regionColorMode === 'ethnicity'
          ? (r.ethnicityId && ethnicityColor.get(r.ethnicityId)) || NO_ETHNICITY_COLOR
          : r.color;
      if (color) colors.set(r.code, color);
    }
    return colors;
  }, [map.regions, regionColorMode, ethnicityColor]);

  useEffect(() => {
    if (canvasRef.current) renderGrid(canvasRef.current, map, regionColors);
    // gridVersion: as grades são mutadas no lugar durante a pintura
  }, [map.terrain, map.regionGrid, map.width, map.height, regionColors, gridVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectable = !!onElementPointerDown;
  const isSelected = (kind: MapSelection['kind'], id: string) =>
    selected?.kind === kind && selected.id === id;
  const down = (kind: MapSelection['kind'], id: string) =>
    selectable
      ? (e: PointerEvent) => {
          e.stopPropagation();
          onElementPointerDown!({ kind, id }, e);
        }
      : undefined;

  const W = map.width;
  const H = map.height;

  return (
    <div className="map-stage" style={{ width: W * CELL_PX * zoom, height: H * CELL_PX * zoom }}>
      <canvas ref={canvasRef} className="map-canvas" />
      <svg
        ref={svgRef}
        className={`map-svg ${selectable ? 'selectable' : ''}`}
        viewBox={`0 0 ${W} ${H}`}
        style={{ cursor }}
        {...svgHandlers}
      >
        {/* territórios: área tracejada de uma etnia, ignora fronteiras */}
        {map.territories.map((t) => {
          const color = (t.ethnicityId && ethnicityColor.get(t.ethnicityId)) || '#444444';
          const c = territoryCenter(t.shape);
          const labelY = t.shape.kind === 'circle' ? t.shape.cy - t.shape.r + 3 : c.y;
          const common = {
            className: `map-territory ${isSelected('territory', t.id) ? 'selected' : ''}`,
            stroke: color,
            fill: color,
            onPointerDown: down('territory', t.id),
          };
          return (
            <g key={t.id}>
              {t.shape.kind === 'circle' ? (
                <circle {...common} cx={t.shape.cx} cy={t.shape.cy} r={t.shape.r} />
              ) : (
                <polygon {...common} points={t.shape.points.map((p) => p.join(',')).join(' ')} />
              )}
              {t.name && (
                <text className="map-text map-territory-label" x={c.x} y={labelY} fill={color}>
                  {t.name}
                </text>
              )}
            </g>
          );
        })}

        {/* rios, estradas e cordilheiras */}
        {map.paths.map((p) => {
          const style = pathStyle(p.type);
          const size = p.size ?? 1;
          const points = p.points.map((pt) => pt.join(',')).join(' ');
          const mid = p.name ? pathMidpoint(p.points) : null;
          return (
            <g key={p.id} className={isSelected('path', p.id) ? 'map-path selected' : 'map-path'}>
              {p.type === 'mountains' ? (
                <>
                  {/* guia da linha: só aparece quando selecionada */}
                  <polyline className="mountain-guide" points={points} />
                  <Mountains path={p} />
                </>
              ) : (
                <polyline
                  points={points}
                  stroke={style.color}
                  strokeWidth={style.width * size}
                  strokeDasharray={style.dash || undefined}
                />
              )}
              {mid && (
                <text
                  className="map-text path-label"
                  x={mid.x}
                  y={mid.y + (p.type === 'mountains' ? 4.2 * size : 2)}
                  style={{ fontSize: `${2.4 * Math.sqrt(size)}px` }}
                >
                  {p.name}
                </text>
              )}
              {/* área de clique mais larga que o traço */}
              {selectable && <polyline className="hit" points={points} onPointerDown={down('path', p.id)} />}
            </g>
          );
        })}

        {/* marcadores e rótulos */}
        {map.features.map((f) =>
          f.type === 'label' ? (
            <text
              key={f.id}
              className={`map-text map-label ${isSelected('feature', f.id) ? 'selected' : ''}`}
              x={f.x}
              y={f.y}
              style={{ fontSize: `${4 * (f.size ?? 1)}px` }}
              onPointerDown={down('feature', f.id)}
            >
              {f.name || 'Rótulo'}
            </text>
          ) : (
            <g
              key={f.id}
              className={`map-feature ${isSelected('feature', f.id) ? 'selected' : ''}`}
              onPointerDown={down('feature', f.id)}
            >
              <circle className="ring" cx={f.x} cy={f.y} r={Math.max(featureExtent(f).ex, featureExtent(f).ey)} />
              {f.type === 'range' ? (
                <RangeMarker x={f.x} y={f.y} size={f.size ?? 1} />
              ) : (
                <text className="icon" x={f.x} y={f.y} style={{ fontSize: `${5 * (f.size ?? 1)}px` }}>
                  {featureIcon(f.type)}
                </text>
              )}
              {f.name && (
                <text
                  className="map-text name"
                  x={f.x}
                  y={f.y + (f.type === 'range' ? 2.2 : 3.2) * (f.size ?? 1)}
                  // o nome cresce menos que o ícone, para não dominar o mapa
                  style={{ fontSize: `${2.6 * Math.sqrt(f.size ?? 1)}px` }}
                >
                  {f.name}
                </text>
              )}
            </g>
          ),
        )}

        {children}
      </svg>
    </div>
  );
}
