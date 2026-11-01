import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { MapLocation } from '@wonderland/shared';
import { LocationPicker } from '../components/LocationPicker';
import { CELL_PX } from './MapView';

/** Por quanto tempo o lugar encontrado fica piscando. */
const HIGHLIGHT_MS = 3500;

type Highlight = { location: MapLocation; nonce: number };

/**
 * Busca de lugares nas telas de visualização: `focus` rola o mapa até deixar o lugar
 * no centro e o destaca por alguns segundos.
 */
export function useMapSearch(scrollRef: RefObject<HTMLDivElement | null>, zoom: number) {
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    if (!highlight) return;
    const id = window.setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(id);
  }, [highlight]);

  const focus = useCallback(
    (location: MapLocation) => {
      const el = scrollRef.current;
      const stage = el?.querySelector('.map-stage');
      if (el && stage) {
        const s = stage.getBoundingClientRect();
        const c = el.getBoundingClientRect();
        const scale = CELL_PX * zoomRef.current;
        // posição do lugar dentro do conteúdo rolável
        const x = s.left - c.left + el.scrollLeft + location.x * scale;
        const y = s.top - c.top + el.scrollTop + location.y * scale;
        el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: 'smooth' });
        // na aba Mapa o mapa pode estar abaixo da dobra: traz a página até ele
        if (c.top < 0 || c.bottom > window.innerHeight) window.scrollBy({ top: c.top - 12, behavior: 'smooth' });
      }
      setHighlight({ location, nonce: Date.now() });
    },
    [scrollRef],
  );

  return { highlight, focus };
}

/** Campo com autocompletar; escolher um lugar chama `onPick`. */
export function MapSearchInput({ locations, onPick }: { locations: MapLocation[]; onPick: (l: MapLocation) => void }) {
  return (
    <div className="map-search">
      <LocationPicker
        locations={locations}
        value=""
        onChange={(key) => {
          const l = locations.find((l) => `${l.kind}:${l.id}` === key);
          if (l) onPick(l);
        }}
        placeholder="🔍 Procurar lugar no mapa…"
      />
    </div>
  );
}

/** Anéis piscando em volta do lugar encontrado (desenhados dentro do SVG do mapa). */
export function SearchHighlight({ highlight, zoom }: { highlight: Highlight | null; zoom: number }) {
  if (!highlight) return null;
  const { x, y } = highlight.location;
  // tamanhos em pixels de tela, convertidos para unidades do mapa (células)
  const px = 1 / (CELL_PX * zoom);
  return (
    <g key={highlight.nonce} className="search-highlight">
      <circle className="ripple" cx={x} cy={y} r={30 * px} strokeWidth={3 * px} />
      <circle className="ripple late" cx={x} cy={y} r={30 * px} strokeWidth={3 * px} />
      <circle className="ring" cx={x} cy={y} r={22 * px} strokeWidth={4 * px} />
      <circle className="dot" cx={x} cy={y} r={3 * px} />
    </g>
  );
}
