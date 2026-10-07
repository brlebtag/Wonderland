import { useState, type FormEvent } from 'react';
import type { CharacterRef, EventInput } from '../api';
import { CharacterPicker } from './CharacterPicker';

type Props = {
  initial?: Partial<EventInput>;
  /** Personagens da história que podem ser vinculados. */
  characters: CharacterRef[];
  onCreateCharacter: (name: string) => Promise<CharacterRef>;
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<unknown>;
  onCancel?: () => void;
  onTrash?: () => void;
};

export function EventForm({
  initial,
  characters,
  onCreateCharacter,
  submitLabel,
  onSubmit,
  onCancel,
  onTrash,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [characterIds, setCharacterIds] = useState(initial?.characterIds ?? []);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({ title, date, description, characterIds });
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
