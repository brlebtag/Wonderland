import { Link, useParams } from 'react-router';
import { characterFields } from '@wonderland/shared';
import { useCharacters, useDeleteCharacter, useStory, type Character } from '../api';
import { formatAttribute } from '../characterDisplay';
import { StoryHeader } from '../components/StoryHeader';

const SUMMARY_KEYS = ['sex', 'age', 'birthPlace'];

/** Linha curta com alguns dados da ficha (ex.: "Feminino · 7 anos · Oxford"). */
function summary(character: Character) {
  return SUMMARY_KEYS.flatMap((key) => {
    const field = characterFields.find((f) => f.key === key)!;
    const value = character.attributes[key];
    return value === undefined ? [] : [formatAttribute(field, value)];
  }).join(' · ');
}

export function CharactersPage() {
  const { id = '' } = useParams();
  const story = useStory(id);
  const characters = useCharacters(id);
  const deleteCharacter = useDeleteCharacter(id);

  if (story.isLoading) return <main className="container muted">Carregando…</main>;
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

      <div className="page-header">
        <h2>Personagens</h2>
        <Link className="button" to={`/stories/${id}/characters/new`}>
          + Novo personagem
        </Link>
      </div>

      {characters.data?.length === 0 && <p className="muted">Nenhum personagem cadastrado.</p>}

      <ul className="story-list">
        {characters.data?.map((c) => (
          <li key={c.id} className="card story-item">
            <div>
              <Link to={`/stories/${id}/characters/${c.id}`} className="story-title">
                {c.name}
              </Link>
              {c.nickname && <span className="muted"> “{c.nickname}”</span>}
              {summary(c) && <div className="muted">{summary(c)}</div>}
            </div>
            <div className="actions">
              <Link className="button ghost" to={`/stories/${id}/characters/${c.id}/edit`}>
                Editar
              </Link>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Mover "${c.name}" para a lixeira?`)) deleteCharacter.mutate(c.id);
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
