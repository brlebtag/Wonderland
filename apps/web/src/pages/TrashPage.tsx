import { Link } from 'react-router';
import { usePurgeStory, useRestoreStory, useTrashedStories, type TrashedStory } from '../api';
import { TrashItem } from '../components/TrashItem';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function contents(story: TrashedStory) {
  const { events, characters, ethnicities } = story._count;
  return `${plural(events, 'evento', 'eventos')}, ${plural(characters, 'personagem', 'personagens')} e ${plural(ethnicities, 'etnia', 'etnias')}`;
}

/** Lixeira geral: histórias apagadas. Eventos e personagens ficam na lixeira de cada história. */
export function TrashPage() {
  const stories = useTrashedStories();
  const restore = useRestoreStory();
  const purge = usePurgeStory();

  return (
    <main className="container">
      <Link to="/">← Histórias</Link>
      <h1>Lixeira</h1>
      <p className="muted">
        Histórias apagadas. Restaurar traz de volta a história com seus eventos e personagens.
        Eventos e personagens apagados individualmente ficam na aba Lixeira de cada história.
      </p>

      {stories.isLoading && <p className="muted">Carregando…</p>}
      {stories.error && <p className="error">{stories.error.message}</p>}
      {stories.data?.length === 0 && <p className="muted">A lixeira está vazia.</p>}

      <ul className="story-list">
        {stories.data?.map((story) => (
          <TrashItem
            key={story.id}
            title={story.title}
            details={`Contém ${contents(story)}`}
            deletedAt={story.deletedAt}
            name={story.title}
            purgeAlso={`junto com ${contents(story)}`}
            onRestore={() => restore.mutate(story.id)}
            onPurge={() => purge.mutate(story.id)}
          />
        ))}
      </ul>
    </main>
  );
}
