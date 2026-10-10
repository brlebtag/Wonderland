import { Link, useNavigate, useParams } from 'react-router';
import { familyRoleLabel } from '@wonderland/shared';
import {
  useCharacter,
  useCharacterEvents,
  useCharacterRelations,
  useDeleteCharacter,
  useEthnicities,
  useEvents,
} from '../api';
import { filledGroups, formatAttribute } from '../characterDisplay';
import { EventsSection } from '../components/EventsSection';
import { LifeBadge, lifeOf, lifeSummary } from '../components/LifeStatus';
import { useMapLocations } from '../mapLocations';
import { lifeMoment } from '../timelineLayout';

export function CharacterPage() {
  const { id: storyId = '', characterId = '' } = useParams();
  const character = useCharacter(characterId);
  const characterEvents = useCharacterEvents(characterId);
  // "Dias atuais" = evento mais recente da história inteira, não só deste personagem.
  const storyEvents = useEvents(storyId);
  const deleteCharacter = useDeleteCharacter(storyId);
  const ethnicities = useEthnicities(storyId);
  const relations = useCharacterRelations(characterId);
  const map = useMapLocations(storyId);
  const navigate = useNavigate();

  if (character.isLoading) return <main className="container muted">Carregando…</main>;
  if (!character.data) {
    return (
      <main className="container">
        <p className="error">Personagem não encontrado.</p>
        <Link to={`/stories/${storyId}/characters`}>← Voltar</Link>
      </main>
    );
  }

  const c = character.data;
  const presentDate = storyEvents.data?.at(-1)?.date;
  const life = lifeOf(c);
  const summary = lifeSummary(c, presentDate);
  const birthPlace = c.birthLocationId ? map.byId.get(c.birthLocationId) : undefined;
  const groups = filledGroups(c.attributes);
  const ethnicity = ethnicities.data?.find((e) => e.id === c.ethnicityId);

  return (
    <main className="container wide">
      <Link to={`/stories/${storyId}/characters`}>← Personagens</Link>

      <header className="page-header">
        <div>
          <h1>
            {c.name}
            {c.nickname && <span className="muted nickname"> “{c.nickname}”</span>}
          </h1>
          {ethnicity && (
            <p className="ethnicity-title">
              <span className="swatch" style={{ background: ethnicity.color }} />
              {ethnicity.name}
              {ethnicity.kind && <span className="muted"> · {ethnicity.kind}</span>}
            </p>
          )}
          <p className="life-line">
            <LifeBadge character={c} />
            {summary && <span>{summary}</span>}
          </p>
          {birthPlace && <p className="muted">Nasceu em 📍 {birthPlace.name}</p>}
          {relations.data && relations.data.length > 0 && (
            <ul className="family-list">
              {relations.data.map((r) => (
                <li key={r.other.id}>
                  <span className="muted">{familyRoleLabel(r.role, r.other.sex)}:</span>{' '}
                  <Link to={`/stories/${storyId}/characters/${r.other.id}`}>{r.other.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="actions">
          <Link className="button ghost" to={`/stories/${storyId}/characters/${c.id}/edit`}>
            Editar
          </Link>
          <button
            className="danger"
            onClick={() => {
              if (!confirm(`Mover "${c.name}" para a lixeira?`)) return;
              deleteCharacter.mutate(c.id);
              navigate(`/stories/${storyId}/characters`);
            }}
          >
            Lixeira
          </button>
        </div>
      </header>

      <details className="card sheet" open>
        <summary>Ficha</summary>
        {groups.length === 0 ? (
          <p className="muted">
            Ficha vazia. <Link to={`/stories/${storyId}/characters/${c.id}/edit`}>Preencher</Link>
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <h3>{group.label}</h3>
              <dl>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{formatAttribute(field, c.attributes[field.key])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </details>

      <EventsSection
        storyId={storyId}
        title={`Eventos de ${c.name}`}
        events={characterEvents.data ?? []}
        presentDate={presentDate}
        newEventHref={`/stories/${storyId}/events/new?characterId=${c.id}`}
        lifeMomentOf={(e) => lifeMoment(e.date, life.birth, life.death)}
      />
    </main>
  );
}
