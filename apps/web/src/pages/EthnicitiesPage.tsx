import { Link, useParams } from 'react-router';
import { useCharacters, useDeleteEthnicity, useEthnicities, useStory } from '../api';
import { StoryHeader } from '../components/StoryHeader';

export const ETHNICITY_KINDS = ['Nação', 'Reino', 'Império', 'Povo', 'Tribo', 'Clã', 'Etnia'];

export function EthnicitiesPage() {
  const { id = '' } = useParams();
  const story = useStory(id);
  const ethnicities = useEthnicities(id);
  const characters = useCharacters(id);
  const deleteEthnicity = useDeleteEthnicity(id);

  if (story.isLoading) return <main className="container muted">Carregando…</main>;
  if (!story.data) {
    return (
      <main className="container">
        <p className="error">História não encontrada.</p>
        <Link to="/">← Voltar</Link>
      </main>
    );
  }

  const membersOf = (ethnicityId: string) =>
    (characters.data ?? []).filter((c) => c.ethnicityId === ethnicityId);

  return (
    <main className="container wide">
      <StoryHeader story={story.data} />

      <div className="page-header">
        <h2>Etnias</h2>
        <Link className="button" to={`/stories/${id}/ethnicities/new`}>
          + Nova etnia
        </Link>
      </div>
      <p className="muted">
        Nações, reinos, povos e tribos. Podem ser vinculadas a personagens e, no mapa, a regiões e
        territórios.
      </p>

      {ethnicities.data?.length === 0 && <p className="muted">Nenhuma etnia cadastrada.</p>}

      <ul className="story-list">
        {ethnicities.data?.map((e) => {
          const members = membersOf(e.id);
          return (
            <li key={e.id} className="card story-item">
              <div>
                <div className="ethnicity-title">
                  <span className="swatch" style={{ background: e.color }} />
                  <span className="story-title">{e.name}</span>
                  {e.kind && <span className="muted"> · {e.kind}</span>}
                </div>
                {e.description && <p className="event-desc">{e.description}</p>}
                {members.length > 0 && (
                  <div className="chips">
                    {members.map((c) => (
                      <Link key={c.id} className="chip" to={`/stories/${id}/characters/${c.id}`}>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="actions">
                <Link className="button ghost" to={`/stories/${id}/ethnicities/${e.id}/edit`}>
                  Editar
                </Link>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirm(`Mover "${e.name}" para a lixeira?`)) deleteEthnicity.mutate(e.id);
                  }}
                >
                  Lixeira
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
