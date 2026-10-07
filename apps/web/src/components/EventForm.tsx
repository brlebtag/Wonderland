import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { LocationKind, MapLocation } from '@wonderland/shared';
import type { CharacterRef, EventInput } from '../api';
import { groupLocations } from '../mapLocations';
import { CharacterPicker } from './CharacterPicker';

type Props = {
  initial?: Partial<EventInput>;
  /** Personagens da história que podem ser vinculados. */
  characters: CharacterRef[];
  onCreateCharacter: (name: string) => Promise<CharacterRef>;
  /** Lugares do mapa; null quando a história ainda não tem mapa. */
  locations: MapLocation[] | null;
  mapHref: string;
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<unknown>;
  onCancel?: () => void;
  onTrash?: () => void;
};

export function EventForm({
  initial,
  characters,
  onCreateCharacter,
  locations,
  mapHref,
  submitLabel,
  onSubmit,
  onCancel,
  onTrash,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [characterIds, setCharacterIds] = useState(initial?.characterIds ?? []);
  // "kind:id" ou '' (sem local)
  const [location, setLocation] = useState(
    initial?.location ? `${initial.location.kind}:${initial.location.id}` : '',
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const [kind, id] = location.split(':');
      await onSubmit({
        title,
        date,
        description,
        characterIds,
        location: location ? { kind: kind as LocationKind, id } : null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="row">
        <label className="grow">
          Título
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <label>
        Descrição
        <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Local
        {locations ? (
          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">— sem local —</option>
            {groupLocations(locations).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((l) => (
                  <option key={l.id} value={`${l.kind}:${l.id}`}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <span className="muted">
            A história ainda não tem mapa. <Link to={mapHref}>Criar o mapa</Link>
          </span>
        )}
      </label>
      <div className="field">
        <span className="field-label">Personagens que aparecem no evento</span>
        <CharacterPicker
          characters={characters}
          value={characterIds}
          onChange={setCharacterIds}
          onCreate={onCreateCharacter}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={saving}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        {onTrash && (
          <button type="button" className="danger" onClick={onTrash}>
            Mover para lixeira
          </button>
        )}
      </div>
    </form>
  );
}
