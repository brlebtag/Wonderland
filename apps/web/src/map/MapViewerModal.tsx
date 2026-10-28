import { useEffect, useRef } from 'react';
import type { Ethnicity } from '../api';
import { useStoredState } from '../storage';
import type { EditableMap } from './mapDoc';
import { MapView } from './MapView';
import { MapOverlay } from './MapOverlay';
import { MeasureButton, RulerOverlay, useMeasureMode } from './ruler';
import { parseZoom, useFitZoom, type ZoomPref } from './useFitZoom';
import { useMapNavigation } from './useMapNavigation';
import { ZoomSelect } from './ZoomSelect';

type Props = {
  map: EditableMap;
  ethnicities: Ethnicity[];
  title: string;
  onClose: () => void;
};

/**
 * Janela em tela cheia só com o mapa, do jeito que foi desenhado (cores das regiões,
 * sem linha do tempo nem personagens). Roda do mouse dá zoom, arrastar move, Esc fecha.
 */
export function MapViewerModal({ map, ethnicities, title, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // zoom próprio, separado do zoom da aba Mapa
  const [zoomPref, setZoomPref] = useStoredState<ZoomPref>('wonderland.mapViewerZoom', 'fit', parseZoom);
  const fitZoom = useFitZoom(scrollRef, map.width, map.height);
  const zoom = zoomPref === 'fit' ? fitZoom : zoomPref;
  const measure = useMeasureMode(map);
  const { panning, containerProps } = useMapNavigation({
    scrollRef,
    zoom,
    setZoom: setZoomPref,
    shouldPan: (e) => e.button === 1 || (e.button === 0 && !measure.measuring),
  });

  // Esc fecha (medindo, o primeiro Esc só limpa a régua); a página por trás não rola
  const measuringRef = useRef(false);
  measuringRef.current = measure.measuring && measure.ruler.points.length > 0;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !measuringRef.current) onClose();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="map-modal" role="dialog" aria-modal="true" aria-label={`Mapa de ${title}`}>
      <div className="map-modal-bar">
        <strong>{title}</strong>
        <span className="muted small">Roda do mouse: zoom · arrastar: mover · Esc: fechar</span>
        <span className="toolbar-spacer" />
        <MeasureButton measuring={measure.measuring} onToggle={measure.toggle} />
        <ZoomSelect value={zoomPref} onChange={setZoomPref} />
        <button className="ghost" onClick={onClose} title="Fechar (Esc)" autoFocus>
          ✕ Fechar
        </button>
      </div>
      <div className="map-frame">
        <div className="map-scroll" ref={scrollRef} {...containerProps}>
          <MapView
            map={map}
            gridVersion={0}
            zoom={zoom}
            regionColorMode="region"
            ethnicities={ethnicities}
            cursor={measure.measuring ? 'crosshair' : panning ? 'grabbing' : 'grab'}
            svgHandlers={measure.svgHandlers}
          >
            <RulerOverlay ruler={measure.ruler} map={map} meta={map.meta} zoom={zoom} />
          </MapView>
        </div>
        <MapOverlay map={map} meta={map.meta} zoom={zoom} />
      </div>
    </div>
  );
}
