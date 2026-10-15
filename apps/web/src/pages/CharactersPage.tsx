import { Link, useParams, useSearchParams } from 'react-router';
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
import {
  filterCharacters,
  hasFilters,
  NO_FILTERS,
  type CharacterFilters,
} from '../characterFilters';
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

  // Os filtros ficam na URL: voltar da ficha de um personagem mantém a lista filtrada.
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(
    Object.entries(NO_FILTERS).map(([k, v]) => [k, params.get(k) ?? v]),
  ) as CharacterFilters;
  const setFilter = (key: keyof CharacterFilters, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value === NO_FILTERS[key]) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const all = characters.data ?? [];
  const shown = filterCharacters([...all], filters, presentDate);
  const sexOptions = characterFields.find((f) => f.key === 'sex')!.options ?? [];
  // só oferece os locais de nascimento que algum personagem usa
  const birthPlaces = [...new Set(all.flatMap((c) => (c.birthLocationId ? [c.birthLocationId] : [])))]
    .flatMap((placeId) => {
      const l = map.byId.get(placeId);
      return l ? [l] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

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

      {all.length === 0 && !characters.isLoading && <p className="muted">Nenhum personagem cadastrado.</p>}

      {all.length > 0 && (
        <section className="card filters">
          <label className="grow">
            Nome ou apelido
            <input
              type="search"
              placeholder="Buscar…"
              value={filters.q}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </label>
          <label>
            Etnia
            <select value={filters.ethnicity} onChange={(e) => setFilter('ethnicity', e.target.value)}>
              <option value="">Todas</option>
              {(ethnicities.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
              <option value="none">Sem etnia</option>
            </select>
          </label>
          <label>
            Situação
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">Todos</option>
              <option value="alive">Vivos</option>
              <option value="dead">Falecidos</option>
            </select>
          </label>
          <label>
            Sexo
            <select value={filters.sex} onChange={(e) => setFilter('sex', e.target.value)}>
              <option value="">Todos</option>
              {sexOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value="none">Não informado</option>
            </select>
          </label>
          <label>
            Nasceu em
            <select value={filters.place} onChange={(e) => setFilter('place', e.target.value)}>
              <option value="">Qualquer lugar</option>
              {birthPlaces.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value="none">Não informado</option>
            </select>
          </label>
          <label>
            Idade
            <span className="age-range">
              <input
                type="number"
                min={0}
                placeholder="de"
                value={filters.ageMin}
                onChange={(e) => setFilter('ageMin', e.target.value)}
              />
              <input
                type="number"
                min={0}
                placeholder="até"
                value={filters.ageMax}
                onChange={(e) => setFilter('ageMax', e.target.value)}
              />
            </span>
          </label>
          <label>
            Ordenar por
            <select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
              <option value="name">Nome</option>
              <option value="age-asc">Idade (mais novos)</option>
              <option value="age-desc">Idade (mais velhos)</option>
              <option value="birth">Data de nascimento</option>
            </select>
          </label>
          <div className="filters-footer">
            <span className="muted">
              {shown.length === all.length
                ? `${all.length} personagem(ns)`
                : `Mostrando ${shown.length} de ${all.length}`}
            </span>
            {hasFilters(filters) && (
              <button className="ghost" onClick={() => setParams({}, { replace: true })}>
                Limpar filtros
              </button>
            )}
          </div>
        </section>
      )}

      {all.length > 0 && shown.length === 0 && (
        <p className="muted">Nenhum personagem corresponde aos filtros.</p>
      )}

      <ul className="story-list">
        {shown.map((c) => (
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
