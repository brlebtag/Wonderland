import { Link } from 'react-router';
import { useDeleteStory, useStories } from '../api';

export function StoriesPage() {
  const stories = useStories();
  const deleteStory = useDeleteStory();

  return (
    <main className="container">
      <header className="page-header">
        <h1>Histórias</h1>
        <Link className="button" to="/stories/new">
          + Nova história
        </Link>
      </header>

      {stories.isLoading && <p className="muted">Carregando…</p>}
      {stories.error && <p className="error">{stories.error.message}</p>}
      {stories.data?.length === 0 && <p className="muted">Nenhuma história cadastrada.</p>}

      <ul className="story-list">
        {stories.data?.map((story) => (
          <li key={story.id} className="card story-item">
            <div>
              <Link to={`/stories/${story.id}`} className="story-title">
                {story.title}
              </Link>
              {story.description && <p className="story-desc">{story.description}</p>}
              <small className="muted">
                Atualizada em {new Date(story.updatedAt).toLocaleString('pt-BR')}
              </small>
            </div>
            <div className="actions">
              <Link className="button ghost" to={`/stories/${story.id}/edit`}>
                Editar
              </Link>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Mover "${story.title}" para a lixeira?`)) deleteStory.mutate(story.id);
                }}
              >
                Lixeira
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
