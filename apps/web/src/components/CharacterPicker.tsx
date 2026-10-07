import { useState, type KeyboardEvent } from 'react';
import type { CharacterRef } from '../api';
import { ChipSelect } from './ChipSelect';

type Props = {
  /** Personagens da história. */
  characters: CharacterRef[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Cria um personagem só com o nome (a ficha é preenchida depois). */
  onCreate: (name: string) => Promise<CharacterRef>;
};

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Vincula personagens a um evento: chips para marcar/desmarcar, uma caixa que filtra pelo nome
 * e, se o nome não existir, cria o personagem na hora já vinculado.
 */
export function CharacterPicker({ characters, value, onChange, onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  // Recém-criados aparecem antes de a lista de personagens recarregar.
  const [created, setCreated] = useState<CharacterRef[]>([]);

  const all = [...characters, ...created.filter((c) => !characters.some((x) => x.id === c.id))];
  const q = normalize(query);
  const exact = all.find((c) => normalize(c.name) === q);
  // Os marcados aparecem sempre; os demais, só se baterem com o filtro.
  const visible = all.filter((c) => value.includes(c.id) || !q || normalize(c.name).includes(q));

  async function create() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(undefined);
    try {
      const character = await onCreate(name);
      setCreated((list) => [...list, character]);
      onChange([...value, character.id]);
      setQuery('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // não envia o formulário do evento
    if (!q) return;
    if (exact) {
      if (!value.includes(exact.id)) onChange([...value, exact.id]);
      setQuery('');
    } else {
      void create();
    }
  }

  return (
    <div className="character-picker">
      <div className="row">
        <input
          className="grow"
          placeholder={all.length ? 'Filtrar ou criar personagem…' : 'Nome do novo personagem…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {q && !exact && (
          <button type="button" className="ghost" disabled={creating} onClick={create}>
            + Criar “{query.trim()}”
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {visible.length > 0 ? (
        <ChipSelect
          options={visible.map((c) => ({ value: c.id, label: c.name }))}
          value={value}
          onChange={onChange}
        />
      ) : (
        <span className="muted">
          {all.length ? 'Nenhum personagem com esse nome.' : 'Nenhum personagem cadastrado ainda.'}
        </span>
      )}
    </div>
  );
}
