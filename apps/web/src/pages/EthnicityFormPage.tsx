import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { useCreateEthnicity, useEthnicity, useUpdateEthnicity, type EthnicityInput } from '../api';
import { useGoBack } from '../navigation';
import { ETHNICITY_KINDS } from './EthnicitiesPage';

function EthnicityForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: EthnicityInput;
  submitLabel: string;
  onSubmit: (input: EthnicityInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState(initial?.kind ?? '');
  const [color, setColor] = useState(initial?.color ?? '#8a6ad8');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({ name, kind, color, description });
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
          Nome
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Tipo
          <input list="ethnicity-kinds" value={kind} onChange={(e) => setKind(e.target.value)} />
          <datalist id="ethnicity-kinds">
            {ETHNICITY_KINDS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label>
          Cor no mapa
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
      <label>
        Descrição
        <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={saving}>
          {submitLabel}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Cria (/stories/:id/ethnicities/new) ou edita (/stories/:id/ethnicities/:ethnicityId/edit). */
export function EthnicityFormPage() {
  const { id: storyId = '', ethnicityId } = useParams();
  const isNew = !ethnicityId;
  const ethnicity = useEthnicity(ethnicityId);
  const create = useCreateEthnicity(storyId);
  const update = useUpdateEthnicity(storyId, ethnicityId ?? '');
  const goBack = useGoBack(`/stories/${storyId}/ethnicities`);

  if (!isNew && ethnicity.isLoading) return <main className="container muted">Carregando…</main>;
  if (!isNew && !ethnicity.data) {
    return (
      <main className="container">
        <p className="error">Etnia não encontrada.</p>
        <button className="ghost" onClick={goBack}>← Voltar</button>
      </main>
    );
  }

  const e = ethnicity.data;
  return (
    <main className="container">
      <button className="link" onClick={goBack}>← Voltar</button>
      <h1>{isNew ? 'Nova etnia' : `Editar ${e!.name}`}</h1>
      <section className="card">
        <EthnicityForm
          initial={e && { name: e.name, kind: e.kind, color: e.color, description: e.description }}
          submitLabel={isNew ? 'Criar' : 'Salvar'}
          onSubmit={async (input) => {
            if (isNew) await create.mutateAsync(input);
            else await update.mutateAsync(input);
            goBack();
          }}
          onCancel={goBack}
        />
      </section>
    </main>
  );
}
