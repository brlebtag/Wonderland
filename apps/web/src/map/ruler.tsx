import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { distanceKm, formatKm, type MapMeta, type Point } from '@wonderland/shared';
import { CELL_PX } from './MapView';
import { formatTravel, TRAVEL_MODES } from './travel';

/** Ponto do mapa (em células) sob o ponteiro. */
export function cellFromEvent(e: PointerEvent<SVGSVGElement>, map: { width: number; height: number }): Point {
  const r = e.currentTarget.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * map.width, ((e.clientY - r.top) / r.height) * map.height];
}

/**
 * Régua: o primeiro clique marca o ponto A, o segundo o ponto B; um terceiro recomeça.
 * Entre os cliques, B acompanha o cursor.
 */
export function useRuler() {
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const actions = useMemo(
    () => ({
      setHover,
      click: (p: Point) => setPoints((ps) => (ps.length >= 2 ? [p] : [...ps, p])),
      clear: () => {
        setPoints([]);
        setHover(null);
      },
    }),
    [],
  );
  return { points, hover, ...actions };
}

export type Ruler = ReturnType<typeof useRuler>;

/** Linha da régua com a distância em km no meio (desenhada dentro do SVG do mapa). */
export function RulerOverlay({
  ruler,
  map,
  meta,
  zoom,
}: {
  ruler: Ruler;
  map: { width: number; height: number };
  meta: MapMeta;
  zoom: number;
}) {
  const a = ruler.points[0];
  const b = ruler.points[1] ?? ruler.hover;
  if (!a) return null;
  // tamanhos em pixels de tela, convertidos para unidades do mapa (células)
  const px = 1 / (CELL_PX * zoom);
  const label = b ? formatKm(distanceKm(map, meta, a, b)) : '';
  const mid = b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : a;
  return (
    <g className="ruler">
      {b && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={3 * px} strokeDasharray={`${8 * px} ${5 * px}`} />}
      {[a, ...(b ? [b] : [])].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={5 * px} strokeWidth={2 * px} />
      ))}
      {b && (
        <text x={mid[0]} y={mid[1] - 10 * px} style={{ fontSize: `${14 * px}px`, strokeWidth: `${4 * px}px` }}>
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Modo "medir" das telas de visualização: ligado, o clique esquerdo marca os pontos da régua
 * (arrastar com o botão do meio continua movendo o mapa); desligado, o clique arrasta o mapa.
 */
export function useMeasureMode(map: { width: number; height: number }) {
  const ruler = useRuler();
  const [measuring, setMeasuring] = useState(false);

  // Esc limpa a medição em andamento
  useEffect(() => {
    if (!measuring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ruler.clear();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [measuring, ruler.clear]);

  return {
    ruler,
    measuring,
    toggle: () => {
      setMeasuring((m) => !m);
      ruler.clear();
    },
    svgHandlers: measuring
      ? {
          onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
            if (e.button === 0) ruler.click(cellFromEvent(e, map));
          },
          onPointerMove: (e: PointerEvent<SVGSVGElement>) => ruler.setHover(cellFromEvent(e, map)),
          onPointerLeave: () => ruler.setHover(null),
        }
      : undefined,
  };
}

export function MeasureButton({ measuring, onToggle }: { measuring: boolean; onToggle: () => void }) {
  return (
    <button
      className={`ghost ${measuring ? 'active' : ''}`}
      onClick={onToggle}
      title="Clique em dois pontos do mapa para medir a distância em linha reta"
    >
      📏 {measuring ? 'Medindo (clique para sair)' : 'Medir distância'}
    </button>
  );
}

/**
 * Quadro no canto superior esquerdo do mapa com a distância medida pela régua e quanto
 * tempo levaria a pé e a cavalo (ritmo leve a moderado). Some quando não há medição.
 */
export function RulerReadout({
  ruler,
  map,
  meta,
}: {
  ruler: Ruler;
  map: { width: number; height: number };
  meta: MapMeta;
}) {
  const a = ruler.points[0];
  const b = ruler.points[1] ?? ruler.hover;
  if (!a || !b) return null;
  const km = distanceKm(map, meta, a, b);
  return (
    <div className="ruler-readout" aria-live="polite">
      <div className="ruler-readout-distance">
        📏 <strong>{formatKm(km)}</strong>
        {ruler.points.length < 2 && <span className="muted small"> (clique para fixar)</span>}
      </div>
      {TRAVEL_MODES.map((m) => (
        <div key={m.key} title={`${m.kmPerHour.toLocaleString('pt-BR')} km/h, ${m.hoursPerDay} h de viagem por dia`}>
          {m.icon} {m.label}: <strong>{formatTravel(km, m)}</strong>
        </div>
      ))}
      <div className="muted small">ritmo leve a moderado, com pausas</div>
    </div>
  );
}
