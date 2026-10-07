import { Link, useParams, useSearchParams } from 'react-router';
import {
  toInputDate,
  useCharacters,
  useCreateCharacter,
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  useStory,
  useUpdateEvent,
} from '../api';
import { EventForm } from '../components/EventForm';
import { useGoBack } from '../navigation';

/** Cria (/stories/:id/events/new) ou edita (/stories/:id/events/:eventId/edit) um evento. */
export function EventFormPage() {
  const { id: storyId = '', eventId } = useParams();
  // Vindo da página de um personagem, o evento novo já nasce vinculado a ele.
  const [searchParams] = useSearchParams();
  const presetCharacterId = searchParams.get('characterId');
  const isNew = !eventId;
  const story = useStory(storyId);
  const events = useEvents(storyId);
  const characters = useCharacters(storyId);
  const createCharacter = useCreateCharacter(storyId);
  const event = events.data?.find((e) => e.id === eventId);
  const createEvent = useCreateEvent(storyId);
  const updateEvent = useUpdateEvent(storyId);
  const deleteEvent = useDeleteEvent(storyId);
  const goBack = useGoBack(`/stories/${storyId}`);

  if (story.isLoading || events.isLoading || characters.isLoading) return <main className="container muted">Carregando…</main>;
  if (!story.data || (!isNew && !event)) {
    return (
      <main className="container">
        <p className="error">Evento não encontrado.</p>
        <Link to={`/stories/${storyId}`}>← Voltar</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <button className="link" onClick={goBack}>← {story.data.title}</button>
      <h1>{isNew ? 'Novo evento' : 'Editar evento'}</h1>
      <section className="card">
        <EventForm
          initial={
            event
              ? {
                  title: event.title,
                  description: event.description,
                  date: toInputDate(event.date),
                  characterIds: event.characters.map((c) => c.id),
                }
              : { characterIds: presetCharacterId ? [presetCharacterId] : [] }
          }
          characters={characters.data ?? []}
          onCreateCharacter={(name) =>
            createCharacter.mutateAsync({ name, nickname: '', attributes: {} })
          }
          submitLabel={isNew ? 'Adicionar' : 'Salvar'}
          onSubmit={async (input) => {
            if (isNew) await createEvent.mutateAsync(input);
            else await updateEvent.mutateAsync({ id: event!.id, ...input });
            goBack();
          }}
          onCancel={goBack}
          onTrash={
            event &&
            (() => {
              if (!confirm(`Mover o evento "${event.title}" para a lixeira?`)) return;
              // Volta antes de a lista recarregar, para não piscar "Evento não encontrado".
              deleteEvent.mutate(event.id);
              goBack();
            })
          }
        />
      </section>
    </main>
  );
}
