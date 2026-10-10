import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useDeleteEvent, type StoryEvent } from '../api';
import { useMapLocations } from '../mapLocations';
import { useStoredState } from '../storage';
import type { Orientation } from '../timelineLayout';
import { EventList } from './EventList';
import { Timeline } from './Timeline';

const parseOrientation = (raw: string): Orientation | undefined =>
  raw === 'horizontal' || raw === 'vertical' ? raw : undefined;

type Props = {
  storyId: string;
  events: StoryEvent[];
  /** Data dos "dias atuais": o evento mais recente da história (não só dos eventos exibidos). */
  presentDate?: string;
  newEventHref: string;
  title?: string;
  /** Na página de um personagem: a idade dele em cada evento. */
  lifeMomentOf?: (event: StoryEvent) => string | undefined;
};

/** Cabeçalho + timeline + lista de eventos. Usado na história e na página do personagem. */
export function EventsSection({
  storyId,
  events,
  presentDate,
  newEventHref,
  title = 'Eventos',
  lifeMomentOf,
}: Props) {
  const navigate = useNavigate();
  const deleteEvent = useDeleteEvent(storyId);
  const map = useMapLocations(storyId);
  const locationName = (e: StoryEvent) => map.of(e)?.name;
  const [orientation, setOrientation] = useStoredState<Orientation>(
    'wonderland.timelineOrientation',
    'vertical',
    parseOrientation,
  );
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  return (
    <>
      <div className="page-header">
        <h2>{title}</h2>
        <div className="actions">
          <button
            className="ghost"
            onClick={() => setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')}
          >
            {orientation === 'vertical' ? '↔ Horizontal' : '↕ Vertical'}
          </button>
          <Link className="button" to={newEventHref}>
            + Novo evento
          </Link>
        </div>
      </div>

      <div className={`story-body ${orientation}`}>
        <Timeline
          events={events}
          orientation={orientation}
          highlightedIds={highlightedIds}
          presentDate={presentDate}
          locationName={locationName}
          lifeMomentOf={lifeMomentOf}
          onOpenEvent={(e) => navigate(`/stories/${storyId}/events/${e.id}/edit`)}
          onSelectCluster={(evs) => setHighlightedIds(evs.map((e) => e.id))}
        />
        <EventList
          events={events}
          highlightedIds={highlightedIds}
          presentDate={presentDate}
          locationName={locationName}
          lifeMomentOf={lifeMomentOf}
          onHover={setHighlightedIds}
          onTrash={(e) => {
            if (confirm(`Mover o evento "${e.title}" para a lixeira?`)) deleteEvent.mutate(e.id);
          }}
        />
      </div>
    </>
  );
}
