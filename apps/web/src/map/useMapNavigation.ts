import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { clampZoom } from './useFitZoom';

type Options = {
  /** Container rolável (.map-scroll) que contém o .map-stage. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Zoom efetivo atual. */
  zoom: number;
  setZoom: (zoom: number) => void;
  /** Se este clique deve arrastar o mapa (em vez de ir para as ferramentas). */
  shouldPan: (e: PointerEvent) => boolean;
};

/**
 * Navegação no mapa:
 * - roda do mouse sobre o mapa = zoom, mantendo parado o ponto sob o cursor;
 * - arrastar (quando `shouldPan`) = rolar o container.
 */
export function useMapNavigation({ scrollRef, zoom, setZoom, shouldPan }: Options) {
  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;
  // Zoom já desenhado na tela: vários eventos de roda podem chegar antes do próximo render.
  const renderedZoom = useRef(zoom);
  const pendingZoom = useRef(zoom);
  // Quanto rolar depois do render para o ponto sob o cursor continuar no lugar.
  const anchor = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const stage = el.querySelector('.map-stage');
      if (!stage) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? 0.05 : 0.0015; // linhas vs. pixels
      const next = clampZoom(pendingZoom.current * Math.exp(-e.deltaY * step));
      if (next === pendingZoom.current) return;
      const r = stage.getBoundingClientRect();
      const z0 = renderedZoom.current;
      // ponto sob o cursor, em pixels do mapa com zoom 1
      const mx = (e.clientX - r.left) / z0;
      const my = (e.clientY - r.top) / z0;
      anchor.current = { dx: mx * (next - z0), dy: my * (next - z0) };
      pendingZoom.current = next;
      setZoomRef.current(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scrollRef]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && anchor.current) {
      el.scrollLeft += anchor.current.dx;
      el.scrollTop += anchor.current.dy;
    }
    anchor.current = null;
    renderedZoom.current = zoom;
    pendingZoom.current = zoom;
  }, [zoom, scrollRef]);

  // ---------- arrastar ----------
  const [panning, setPanning] = useState(false);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const containerProps = {
    // fase de captura: o arraste não chega às ferramentas do editor
    onPointerDownCapture: (e: PointerEvent<HTMLDivElement>) => {
      if (!shouldPan(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const el = scrollRef.current!;
      pan.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.setPointerCapture(e.pointerId);
      setPanning(true);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (!pan.current) return;
      const el = scrollRef.current!;
      el.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
      el.scrollTop = pan.current.top - (e.clientY - pan.current.y);
    },
    onPointerUp: () => {
      pan.current = null;
      setPanning(false);
    },
    onPointerCancel: () => {
      pan.current = null;
      setPanning(false);
    },
    // impede o "auto-scroll" do botão do meio do navegador
    onMouseDown: (e: { button: number; preventDefault: () => void }) => {
      if (e.button === 1) e.preventDefault();
    },
  };

  return { panning, containerProps };
}
