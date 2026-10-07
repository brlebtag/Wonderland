import { Link, useParams } from 'react-router';
import {
  formatDate,
  usePurgeCharacter,
  usePurgeEvent,
  useRestoreCharacter,
  useRestoreEvent,
  useStory,
  useStoryTrash,
} from '../api';
import { StoryHeader } from '../components/StoryHeader';
import { TrashItem } from '../components/TrashItem';

/** Lixeira de uma história: eventos e personagens apagados. */
export function StoryTrashPage() {
  const { id = '' } = useParams();
  const story = useStory(id);
  const trash = useStoryTrash(id);
  const restoreEvent = useRestoreEvent(id);
  const purgeEvent = usePurgeEvent(id);
  const restoreCharacter = useRestoreCharacter(id);
  const purgeCharacter = usePurgeCharacter(id);

  if (story.isLoading) return <main className="container muted">Carregando…</main>;
  if (!story.data) {
    return (
      <main className="container">
        <p className="error">História não encontrada.</p>
        <Link to="/">← Voltar</Link>
      </main>
    );
  }

  const events = trash.data?.events ?? [];
  const characters = trash.data?.characters ?? [];

  return (
    <main className="container wide">
      <StoryHeader story={story.data} />

      {trash.isLoading && <p className="muted">Carregando…</p>}

      <h2 className="trash-section">Eventos</h2>
      {trash.data && events.length === 0 && <p className="muted">Nenhum evento na lixeira.</p>}
      <ul className="story-list">
        {events.map((e) => (
          <TrashItem
            key={e.id}
            title={e.title}
            details={[formatDate(e.date), e.characters.map((c) => c.name).join(', ')]
              .filter(Boolean)
              .join(' · ')}
            deletedAt={e.deletedAt}
            name={e.title}
            onRestore={() => restoreEvent.mutate(e.id)}
            onPurge={() => purgeEvent.mutate(e.id)}
          />
        ))}
      </ul>

      <h2 className="trash-section">Personagens</h2>
      {trash.data && characters.length === 0 && (
        <p className="muted">Nenhum personagem na lixeira.</p>
      )}
      <ul className="story-list">
        {characters.map((c) => (
          <TrashItem
            key={c.id}
            title={c.nickname ? `${c.name} “${c.nickname}”` : c.name}
            details="Restaurar devolve os vínculos com os eventos; excluir remove só o personagem."
            deletedAt={c.deletedAt}
            name={c.name}
            purgeAlso="(os eventos dele continuam na história)"
            onRestore={() => restoreCharacter.mutate(c.id)}
            onPurge={() => purgeCharacter.mutate(c.id)}
          />
        ))}
      </ul>
    </main>
  );
}
