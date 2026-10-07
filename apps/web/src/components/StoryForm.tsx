import { useState, type FormEvent } from 'react';
import type { StoryInput } from '../api';

type Props = {
  initial?: StoryInput;
  submitLabel: string;
  onSubmit: (input: StoryInput) => Promise<unknown>;
  onCancel?: () => void;
};

export function StoryForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({ title, description });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Título
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Descrição
        <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
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
      </div>
    </form>
  );
}
