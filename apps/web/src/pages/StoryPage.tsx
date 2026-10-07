import { Link, useParams } from 'react-router';
import { useEvents, useStory } from '../api';
import { EventsSection } from '../components/EventsSection';
import { StoryHeader } from '../components/StoryHeader';

export function StoryPage() {
  const { id = '' } = useParams();
  const story = useStory(id);
  const events = useEvents(id);

  if (story.isLoading) return <main className="container muted">Carregando…</main>;
  if (story.error || !story.data) {
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
      <EventsSection
        storyId={id}
        events={events.data ?? []}
        presentDate={events.data?.at(-1)?.date}
        newEventHref={`/stories/${id}/events/new`}
      />
    </main>
  );
}
