import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { formatDate, type StoryEvent } from '../api';
import { formatSincePresent } from '../timelineLayout';

type Props = {
  events: StoryEvent[];
  highlightedIds: string[];
  /** Data dos "dias atuais" (evento mais recente da história). */
  presentDate?: string;
  /** Nome do local do evento no mapa, se houver. */
  locationName?: (event: StoryEvent) => string | undefined;
  /** Momento da vida do personagem naquele evento ("12 anos", "nascimento"...). */
  lifeMomentOf?: (event: StoryEvent) => string | undefined;
  onHover: (ids: string[]) => void;
  onTrash: (event: StoryEvent) => void;
};

export function EventList({
  events,
  highlightedIds,
  presentDate,
  locationName,
  lifeMomentOf,
  onHover,
  onTrash,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  // Ao selecionar um grupo na timeline, rola a lista até o primeiro evento dele.
  const firstHighlighted = highlightedIds[0];
  useEffect(() => {
    if (!firstHighlighted) return;
    listRef.current
      ?.querySelector(`[data-id="${firstHighlighted}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [firstHighlighted]);

  if (events.length === 0) return null;

  return (
    <ul className="event-list" ref={listRef} onMouseLeave={() => onHover([])}>
      {events.map((event) => (
        <li
          key={event.id}
          data-id={event.id}
          className={`card event-item ${highlightedIds.includes(event.id) ? 'highlight' : ''}`}
          onMouseEnter={() => onHover([event.id])}
        >
          <div className="event-info">
            <div className="timeline-date">
              {formatDate(event.date)}
              {presentDate && ` (${formatSincePresent(event.date, presentDate)})`}
              {lifeMomentOf?.(event) && <span className="life-moment">{lifeMomentOf(event)}</span>}
            </div>
            <strong>{event.title}</strong>
            {locationName?.(event) && <div className="event-location">📍 {locationName(event)}</div>}
            {event.description && <p className="event-desc">{event.description}</p>}
            {event.characters.length > 0 && (
              <div className="chips">
                {event.characters.map((c) => (
                  <Link key={c.id} className="chip" to={`/stories/${event.storyId}/characters/${c.id}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="actions">
            <Link className="button ghost" to={`/stories/${event.storyId}/events/${event.id}/edit`}>
              Editar
            </Link>
            <button className="danger" onClick={() => onTrash(event)}>
              Lixeira
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
