import { useEffect, useState, type RefObject } from 'react';
import { CELL_PX } from './MapView';

export const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** 'fit' = o mapa inteiro cabe no espaço disponível; número = zoom livre (roda do mouse ou lista). */
export type ZoomPref = number | 'fit';

export const parseZoom = (raw: string): ZoomPref | undefined => {
  if (raw === 'fit') return 'fit';
  const z = Number(raw);
  return Number.isFinite(z) && z >= MIN_ZOOM && z <= MAX_ZOOM ? z : undefined;
};

/**
 * Zoom em que o mapa inteiro cabe no container: na largura dele e na altura que sobra
 * da janela abaixo dele. Recalcula quando a janela/container mudam de tamanho.
 */
export function useFitZoom(container: RefObject<HTMLElement | null>, mapWidth: number, mapHeight: number) {
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      // folga de 4px para a borda do mapa não gerar barra de rolagem
      const width = el.clientWidth - padX - 4;
      const height = window.innerHeight - el.getBoundingClientRect().top - padY - 24;
      const z = Math.min(width / (mapWidth * CELL_PX), Math.max(200, height) / (mapHeight * CELL_PX));
      setFit(clampZoom(z));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [container, mapWidth, mapHeight]);

  return fit;
}
