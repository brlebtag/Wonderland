import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { listLocations, positionAt, type MapData, type Stop } from '@wonderland/shared';
import {
  formatDate,
  useCharacters,
  useEthnicities,
  useEvents,
  useMap,
  useStory,
  type Character,
  type Ethnicity,
  type StoryEvent,
} from '../api';
import { StoryHeader } from '../components/StoryHeader';
import { CHARACTER_PALETTE, fromData } from '../map/mapDoc';
import { MapView, type RegionColorMode } from '../map/MapView';
import { useStoredState } from '../storage';
import { parseZoom, useFitZoom, type ZoomPref } from '../map/useFitZoom';
import { useMapNavigation } from '../map/useMapNavigation';
import { ZoomSelect } from '../map/ZoomSelect';

const DAY_MS = 86_400_000;
const toDay = (iso: string) => Date.parse(iso) / DAY_MS;
const dayToIso = (t: number) => new Date(Math.round(t) * DAY_MS).toISOString();

const SPEEDS = [
  { label: 'Rápido (10 s)', seconds: 10 },
  { label: 'Normal (30 s)', seconds: 30 },
  { label: 'Lento (60 s)', seconds: 60 },
  { label: 'Muito lento (2 min)', seconds: 120 },
];

export function MapPage() {
  const { id: storyId = '' } = useParams();
  const story = useStory(storyId);
  const map = useMap(storyId);
  const events = useEvents(storyId);
  const characters = useCharacters(storyId);
  const ethnicities = useEthnicities(storyId);

  if (story.isLoading || map.isLoading) return <main className="container muted">Carregando…</main>;
  if (!story.data) {
    return (
      <main className="container">
        <p className="error">História não encontrada.</p>
        <Link to="/">← Voltar</Link>
      </main>
    );
  }

  return (
    <main className="container wide">
      <StoryHeader story={story.data} />
      {map.data?.data ? (
        <MapTimeline
          storyId={storyId}
          data={map.data.data}
          events={events.data ?? []}
          characters={characters.data ?? []}
          ethnicities={ethnicities.data ?? []}
        />
      ) : (
        <section className="card">
          <p>Esta história ainda não tem mapa.</p>
          <p className="muted">
            Pinte continentes e mares, divida em regiões, marque cidades, rios e territórios — depois
            vincule os eventos a esses lugares para ver os personagens se deslocando ao longo do tempo.
          </p>
          <Link className="button" to={`/stories/${storyId}/map/edit`}>
            Criar mapa
          </Link>
        </section>
      )}
    </main>
  );
}

type Track = { character: Character; color: string; stops: Stop[] };

function MapTimeline({
  storyId,
  data,
  events,
  characters,
  ethnicities,
}: {
  storyId: string;
  data: MapData;
  events: StoryEvent[];
  characters: Character[];
  ethnicities: Ethnicity[];
}) {
  const doc = useMemo(() => fromData(data), [data]);
  const locations = useMemo(() => new Map(listLocations(data).map((l) => [l.id, l])), [data]);
  const [zoomPref, setZoomPref] = useStoredState<ZoomPref>('wonderland.mapZoomPref', 'fit', parseZoom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fitZoom = useFitZoom(scrollRef, doc.width, doc.height);
  const zoom = zoomPref === 'fit' ? fitZoom : zoomPref;
  // aqui o mapa só é visualizado: arrastar com o botão esquerdo (ou do meio) move
  const { panning, containerProps } = useMapNavigation({
    scrollRef,
    zoom,
    setZoom: setZoomPref,
    shouldPan: (e) => e.button === 0 || e.button === 1,
  });
  const [colorMode, setColorMode] = useState<RegionColorMode>('ethnicity');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showTrails, setShowTrails] = useState(true);

  // ---------- trilhas: eventos com local, por personagem ----------
  const tracks: Track[] = useMemo(
    () =>
      characters
        .map((character, i) => ({
          character,
          color: CHARACTER_PALETTE[i % CHARACTER_PALETTE.length],
          stops: events.flatMap((e) => {
            const loc = e.locationId ? locations.get(e.locationId) : undefined;
            return loc && e.characters.some((c) => c.id === character.id)
              ? [{ t: toDay(e.date), x: loc.x, y: loc.y, eventId: e.id }]
              : [];
          }),
        }))
        .filter((t) => t.stops.length > 0),
    [characters, events, locations],
  );

  // ---------- tempo ----------
  const eventDays = useMemo(() => [...new Set(events.map((e) => toDay(e.date)))], [events]);
  const tMin = eventDays[0] ?? 0;
  const tMax = eventDays.at(-1) ?? 0;
  const [t, setT] = useState(tMin);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);

  useEffect(() => setT((cur) => Math.min(Math.max(cur, tMin), tMax)), [tMin, tMax]);

  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : now - last.current;
      last.current = now;
      let reachedEnd = false;
      setT((cur) => {
        const next = cur + ((tMax - tMin) / (speed * 1000)) * dt;
        if (next >= tMax) reachedEnd = true;
        return Math.min(next, tMax);
      });
      if (reachedEnd) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      last.current = null;
    };
  }, [playing, speed, tMin, tMax]);

  const prevDay = [...eventDays].reverse().find((d) => d < t - 1e-6);
  const nextDay = eventDays.find((d) => d > t + 1e-6);

  // evento(s) "atuais": os do último dia com evento até o instante t
  const currentDay = [...eventDays].reverse().find((d) => d <= t + 1e-6);
  const currentEvents = events.filter((e) => toDay(e.date) === currentDay);

  // ---------- posições (personagens no mesmo ponto são espalhados em volta dele) ----------
  const positions = tracks
    .filter((tr) => !hidden.has(tr.character.id))
    .flatMap((tr) => {
      const pos = positionAt(tr.stops, t);
      return pos ? [{ ...tr, pos }] : [];
    });
  const spread = new Map<string, { dx: number; dy: number }>();
  const byPlace = new Map<string, string[]>();
  for (const p of positions) {
    const key = `${Math.round(p.pos.x * 2)}:${Math.round(p.pos.y * 2)}`;
    byPlace.set(key, [...(byPlace.get(key) ?? []), p.character.id]);
  }
  for (const ids of byPlace.values()) {
    ids.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
      const r = ids.length > 1 ? 3 : 0;
      spread.set(id, { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r });
    });
  }

  const locationName = (e: StoryEvent) => (e.locationId ? locations.get(e.locationId)?.name : undefined);
  const statusOf = (tr: Track) => {
    const pos = positionAt(tr.stops, t);
    if (!pos) return 'ainda não apareceu';
    const here = (id: string) => locations.get(events.find((e) => e.id === id)?.locationId ?? '')?.name;
    return pos.moving && pos.to ? `a caminho de ${here(pos.to.eventId)}` : `em ${here(pos.from.eventId)}`;
  };

  const located = events.filter((e) => e.locationId && locations.has(e.locationId));

  return (
    <>
      <div className="page-header">
        <h2>Mapa</h2>
        <div className="actions">
          <label className="inline">
            Regiões por
            <select value={colorMode} onChange={(e) => setColorMode(e.target.value as RegionColorMode)}>
              <option value="ethnicity">etnia</option>
              <option value="region">cor da região</option>
            </select>
          </label>
          <ZoomSelect value={zoomPref} onChange={setZoomPref} />
          <Link className="button" to={`/stories/${storyId}/map/edit`}>
            ✏️ Editar mapa
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="muted">Cadastre eventos com local e personagens para vê-los se deslocar no mapa.</p>
      ) : (
        <section className="card map-player">
          <div className="player-controls">
            <button className="ghost" disabled={prevDay === undefined} onClick={() => { setPlaying(false); setT(prevDay!); }} title="Evento anterior">
              ⏮
            </button>
            <button
              onClick={() => {
                if (t >= tMax) setT(tMin);
                setPlaying((p) => !p);
              }}
              disabled={tMin === tMax}
            >
              {playing ? '⏸ Pausar' : '▶ Reproduzir'}
            </button>
            <button className="ghost" disabled={nextDay === undefined} onClick={() => { setPlaying(false); setT(nextDay!); }} title="Próximo evento">
              ⏭
            </button>
            <strong className="player-date">{formatDate(dayToIso(t))}</strong>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => (
                <option key={s.seconds} value={s.seconds}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="player-slider">
            <input
              type="range"
              min={tMin}
              max={tMax}
              step="any"
              value={t}
              disabled={tMin === tMax}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
            />
            {/* marcas dos eventos na régua */}
            <div className="player-ticks">
              {tMax > tMin &&
                eventDays.map((d) => (
                  <span key={d} style={{ left: `${((d - tMin) / (tMax - tMin)) * 100}%` }} />
                ))}
            </div>
            <div className="player-range muted">
              <span>{formatDate(dayToIso(tMin))}</span>
              <span>{formatDate(dayToIso(tMax))}</span>
            </div>
          </div>
          {currentEvents.length > 0 && (
            <div className="player-current">
              {currentEvents.map((e) => (
                <div key={e.id}>
                  <span className="timeline-date">{formatDate(e.date)}</span> <strong>{e.title}</strong>
                  {locationName(e) && <span> · 📍 {locationName(e)}</span>}
                  {e.characters.length > 0 && (
                    <span className="muted"> · {e.characters.map((c) => c.name).join(', ')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="map-viewer">
        <div className="map-scroll" ref={scrollRef} {...containerProps}>
          <MapView
            map={doc}
            gridVersion={0}
            zoom={zoom}
            regionColorMode={colorMode}
            ethnicities={ethnicities}
            cursor={panning ? 'grabbing' : 'grab'}
          >
            {/* locais com eventos; os do momento ficam destacados */}
            {located.map((e) => {
              const loc = locations.get(e.locationId!)!;
              const now = currentEvents.some((c) => c.id === e.id);
              return <circle key={e.id} className={`event-spot ${now ? 'now' : ''}`} cx={loc.x} cy={loc.y} r={now ? 4 : 3} />;
            })}

            {/* trilhas já percorridas */}
            {showTrails &&
              positions.map(({ character, color, stops, pos }) => {
                const past = stops.filter((s) => s.t <= t);
                const pts = [...past.map((s) => [s.x, s.y]), [pos.x, pos.y]];
                return pts.length > 1 ? (
                  <polyline key={`trail-${character.id}`} className="trail" stroke={color} points={pts.map((p) => p.join(',')).join(' ')} />
                ) : null;
              })}

            {/* destino de quem está em trânsito */}
            {positions.map(({ character, color, pos }) =>
              pos.moving && pos.to ? (
                <line key={`to-${character.id}`} className="heading" stroke={color} x1={pos.x} y1={pos.y} x2={pos.to.x} y2={pos.to.y} />
              ) : null,
            )}

            {/* personagens */}
            {positions.map(({ character, color, pos }) => {
              const o = spread.get(character.id)!;
              return (
                <g key={character.id} className="map-character">
                  <circle cx={pos.x + o.dx} cy={pos.y + o.dy} r={1.8} fill={color} />
                  <text className="map-text" x={pos.x + o.dx} y={pos.y + o.dy - 2.6}>
                    {character.name}
                  </text>
                </g>
              );
            })}
          </MapView>
        </div>

        <aside className="map-sidebar">
          <section className="card">
            <div className="page-header compact">
              <h3>Personagens</h3>
              <label className="inline">
                <input type="checkbox" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} />
                trilhas
              </label>
            </div>
            {tracks.length === 0 && (
              <p className="muted">Nenhum personagem em eventos com local. Edite os eventos e escolha o local.</p>
            )}
            <ul className="legend">
              {tracks.map((tr) => (
                <li key={tr.character.id}>
                  <label className="inline">
                    <input
                      type="checkbox"
                      checked={!hidden.has(tr.character.id)}
                      onChange={() =>
                        setHidden((h) => {
                          const n = new Set(h);
                          if (n.has(tr.character.id)) n.delete(tr.character.id);
                          else n.add(tr.character.id);
                          return n;
                        })
                      }
                    />
                    <span className="swatch round" style={{ background: tr.color }} />
                    <Link to={`/stories/${storyId}/characters/${tr.character.id}`}>{tr.character.name}</Link>
                  </label>
                  <div className="muted small">{statusOf(tr)}</div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
