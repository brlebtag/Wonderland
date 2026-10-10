import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { formatDate, type StoryEvent } from '../api';
import { useStoredState } from '../storage';
import {
  formatSincePresent,
  layoutTimeline,
  type Cluster,
  type Orientation,
} from '../timelineLayout';

const SCALE_MIN = 5;
const SCALE_MAX = 150;

const parseScale = (raw: string) => {
  const n = Number(raw);
  return n >= SCALE_MIN && n <= SCALE_MAX ? n : undefined;
};

// Margem nas pontas do eixo: na horizontal precisa caber metade do rótulo (120px).
const PADDING: Record<Orientation, number> = { horizontal: 72, vertical: 28 };
const CARD_WIDTH = 320;
const CARD_MAX_EVENTS = 6;

// Espaçamentos mínimos (px) por orientação: na vertical cabe um rótulo a cada linha de texto.
const SPACING: Record<Orientation, { labelMinPx: number; gapLabelMinPx: number }> = {
  horizontal: { labelMinPx: 130, gapLabelMinPx: 80 },
  vertical: { labelMinPx: 26, gapLabelMinPx: 34 },
};

type Props = {
  events: StoryEvent[];
  orientation: Orientation;
  highlightedIds: string[];
  /** Data dos "dias atuais" (evento mais recente da história). */
  presentDate?: string;
  /** Nome do local do evento no mapa, se houver. */
  locationName?: (event: StoryEvent) => string | undefined;
  /** Momento da vida do personagem naquele evento ("12 anos", "nascimento"...). */
  lifeMomentOf?: (event: StoryEvent) => string | undefined;
  onOpenEvent: (event: StoryEvent) => void;
  onSelectCluster: (events: StoryEvent[]) => void;
};

type Hover = { cluster: Cluster<StoryEvent>; style: CSSProperties };

export function Timeline({
  events,
  orientation,
  highlightedIds,
  presentDate,
  locationName,
  lifeMomentOf,
  onOpenEvent,
  onSelectCluster,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [pxPerLogDay, setPxPerLogDay] = useStoredState('wonderland.timelineScale', 40, parseScale);
  const horizontal = orientation === 'horizontal';

  const layout = useMemo(
    () => layoutTimeline(events, { pxPerLogDay, clusterPx: 22, ...SPACING[orientation] }),
    [events, pxPerLogDay, orientation],
  );

  // Na horizontal, a roda do mouse (vertical) rola a timeline para os lados.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !horizontal) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [horizontal]);

  // Posição ao longo do eixo principal.
  const at = (pos: number): CSSProperties =>
    horizontal ? { left: PADDING.horizontal + pos } : { top: PADDING.vertical + pos };

  function showCard(cluster: Cluster<StoryEvent>, target: HTMLElement) {
    const r = target.getBoundingClientRect();
    const clampX = (x: number) => Math.min(Math.max(x, 8), window.innerWidth - CARD_WIDTH - 8);
    const nearBottom = r.top > window.innerHeight * 0.6;
    let style: CSSProperties;
    if (horizontal) {
      style = nearBottom
        ? { left: clampX(r.left - CARD_WIDTH / 2), top: r.top - 18, transform: 'translateY(-100%)' }
        : { left: clampX(r.left - CARD_WIDTH / 2), top: r.bottom + 18 };
    } else {
      const fitsRight = r.right + 20 + CARD_WIDTH < window.innerWidth;
      const left = fitsRight ? r.right + 20 : clampX(r.left - CARD_WIDTH - 20);
      style = nearBottom
        ? { left, top: r.bottom + 12, transform: 'translateY(-100%)' }
        : { left, top: r.top - 12 };
    }
    setHover({ cluster, style: { ...style, width: CARD_WIDTH } });
  }

  const trackSize = layout.length + PADDING[orientation] * 2;
  const shownInCard = hover?.cluster.events.slice(0, CARD_MAX_EVENTS) ?? [];
  const hiddenInCard = (hover?.cluster.events.length ?? 0) - shownInCard.length;

  return (
    <div className={`timeline ${orientation}`}>
      <label className="timeline-zoom">
        Escala
        <input
          type="range"
          min={SCALE_MIN}
          max={SCALE_MAX}
          value={pxPerLogDay}
          onChange={(e) => setPxPerLogDay(Number(e.target.value))}
        />
      </label>

      <div className="timeline-scroll" ref={scrollRef} onScroll={() => setHover(null)}>
        {events.length === 0 ? (
          <p className="muted timeline-empty">Nenhum evento ainda.</p>
        ) : (
          <div
            className="timeline-track"
            style={horizontal ? { width: trackSize } : { height: trackSize }}
          >
            <div className="timeline-line" />

            {layout.gaps.map(
              (gap, i) =>
                gap.show && (
                  <span key={i} className="timeline-gap" style={at(gap.pos)}>
                    {gap.label}
                  </span>
                ),
            )}

            {layout.clusters.map((cluster) => {
              const first = cluster.events[0];
              const count = cluster.events.length;
              const highlighted = cluster.events.some((e) => highlightedIds.includes(e.id));
              return (
                <button
                  key={first.id}
                  type="button"
                  className={`timeline-node ${count > 1 ? 'cluster' : ''} ${highlighted ? 'selected' : ''}`}
                  style={at(cluster.pos)}
                  aria-label={cluster.events.map((e) => e.title).join(', ')}
                  onMouseEnter={(e) => showCard(cluster, e.currentTarget)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={(e) => showCard(cluster, e.currentTarget)}
                  onBlur={() => setHover(null)}
                  onClick={() => (count > 1 ? onSelectCluster(cluster.events) : onOpenEvent(first))}
                >
                  <span className="timeline-dot">{count > 1 && count}</span>
                  {cluster.showLabel && (
                    <span className="timeline-label">
                      <span className="timeline-date">{formatDate(first.date)}</span>
                      <span className="timeline-title">
                        {count > 1 ? `${count} eventos` : first.title}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hover && (
        <div className="timeline-card" style={hover.style}>
          {shownInCard.map((e) => (
            <div key={e.id} className="timeline-card-item">
              <div className="timeline-date">
                {formatDate(e.date)}
                {presentDate && ` (${formatSincePresent(e.date, presentDate)})`}
                {lifeMomentOf?.(e) && <span className="life-moment">{lifeMomentOf(e)}</span>}
              </div>
              <strong>{e.title}</strong>
              {locationName?.(e) && <div className="event-location">📍 {locationName(e)}</div>}
              {e.description && <p>{e.description}</p>}
            </div>
          ))}
          {hiddenInCard > 0 && <div className="muted">+ {hiddenInCard} eventos (clique para ver)</div>}
        </div>
      )}
    </div>
  );
}
