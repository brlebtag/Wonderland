import { Link, useParams } from 'react-router';
import { characterFields } from '@wonderland/shared';
import {
  useCharacters,
  useDeleteCharacter,
  useEthnicities,
  useEvents,
  useStory,
  type Character,
  type Ethnicity,
} from '../api';
import { formatAttribute } from '../characterDisplay';
import { LifeBadge, lifeSummary } from '../components/LifeStatus';
import { StoryHeader } from '../components/StoryHeader';
import { useMapLocations } from '../mapLocations';

/** Linha curta: etnia, sexo, idade calculada e local de nascimento. */
function summary(character: Character, ethnicities: Ethnicity[], presentDate?: string, birthPlace?: string) {
  const ethnicity = ethnicities.find((e) => e.id === character.ethnicityId)?.name;
  const sexField = characterFields.find((f) => f.key === 'sex')!;
  const sex = character.attributes.sex;
  return [
    ethnicity,
    sex !== undefined && formatAttribute(sexField, sex),
    lifeSummary(character, presentDate),
    birthPlace && `nasceu em ${birthPlace}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function CharactersPage() {
  const { id = '' } = useParams();
  const story = useStory(id);
  const characters = useCharacters(id);
  const deleteCharacter = useDeleteCharacter(id);
  const ethnicities = useEthnicities(id);
  const events = useEvents(id);
  const map = useMapLocations(id);
  const presentDate = events.data?.at(-1)?.date;
  const summaryOf = (c: Character) =>
    summary(
      c,
      ethnicities.data ?? [],
      presentDate,
      c.birthLocationId ? map.byId.get(c.birthLocationId)?.name : undefined,
    );

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
              {c.nickname && <span className="muted"> “{c.nickname}”</span>} <LifeBadge character={c} />
              {summaryOf(c) && <div className="muted">{summaryOf(c)}</div>}
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
