import { useEffect, useMemo, useRef, type PointerEvent, type ReactNode, type Ref } from 'react';
import { FEATURE_TYPES, PATH_TYPES, territoryCenter } from '@wonderland/shared';
import type { Ethnicity } from '../api';
import type { EditableMap } from './mapDoc';
import { renderGrid } from './renderGrid';

/** Pixels por célula com zoom 1. */
export const CELL_PX = 4;

export type MapSelection = { kind: 'feature' | 'path' | 'territory'; id: string };
export type RegionColorMode = 'region' | 'ethnicity';

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
          ? r.ethnicityId && ethnicityColor.get(r.ethnicityId)
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

        {/* rios e estradas */}
        {map.paths.map((p) => {
          const style = pathStyle(p.type);
          const points = p.points.map((pt) => pt.join(',')).join(' ');
          return (
            <g key={p.id} className={isSelected('path', p.id) ? 'map-path selected' : 'map-path'}>
              <polyline
                points={points}
                stroke={style.color}
                strokeWidth={style.width}
                strokeDasharray={style.dash || undefined}
              />
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
              <circle className="ring" cx={f.x} cy={f.y} r={3} />
              <text className="icon" x={f.x} y={f.y}>
                {featureIcon(f.type)}
              </text>
              {f.name && (
                <text className="map-text name" x={f.x} y={f.y + 3.2}>
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
