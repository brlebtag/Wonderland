import { useState, type FormEvent } from 'react';
import {
  characterFieldGroups,
  cleanAttributes,
  type CharacterAttributes,
  type CharacterField,
} from '@wonderland/shared';
import type { CharacterInput, Ethnicity } from '../api';
import { ChipSelect } from './ChipSelect';

type Draft = Record<string, unknown>;

type Props = {
  initial?: CharacterInput;
  /** Etnias da história para o vínculo do personagem. */
  ethnicities: Ethnicity[];
  submitLabel: string;
  onSubmit: (input: CharacterInput) => Promise<unknown>;
  onCancel: () => void;
};

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CharacterField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case 'textarea':
      return <textarea rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return (
        <input
          type="number"
          min={0}
          step="any"
          value={(value as number | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
    case 'date':
      return <input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'boolean':
      return (
        <select
          value={value === undefined || value === '' ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value === 'true')}
        >
          <option value="">—</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      );
    case 'select':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'multiselect':
      return (
        <ChipSelect options={field.options ?? []} value={(value as string[]) ?? []} onChange={onChange} />
      );
    default:
      return <input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

const isFilled = (v: unknown) =>
  v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);

export function CharacterForm({ initial, ethnicities, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [ethnicityId, setEthnicityId] = useState(initial?.ethnicityId ?? '');
  const [attrs, setAttrs] = useState<Draft>(initial?.attributes ?? {});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const setAttr = (key: string, value: unknown) => setAttrs((a) => ({ ...a, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        name,
        nickname,
        ethnicityId: ethnicityId || null,
        attributes: cleanAttributes(attrs) as CharacterAttributes,
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
          Nome
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="grow">
          Apelido
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </label>
        <label className="grow">
          Etnia (nação/reino/povo)
          <select value={ethnicityId} onChange={(e) => setEthnicityId(e.target.value)}>
            <option value="">—</option>
            {ethnicities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.kind && ` (${e.kind})`}
              </option>
            ))}
            {/* etnia vinculada que está na lixeira: mantém a opção para não perder o vínculo */}
            {ethnicityId && !ethnicities.some((e) => e.id === ethnicityId) && (
              <option value={ethnicityId}>(etnia na lixeira)</option>
            )}
          </select>
        </label>
      </div>

      {characterFieldGroups.map((group, i) => {
        const filled = group.fields.filter((f) => isFilled(attrs[f.key])).length;
        return (
          <details key={group.key} className="field-group" open={i === 0}>
            <summary>
              {group.label}
              {filled > 0 && <span className="muted"> · {filled} preenchido(s)</span>}
            </summary>
            <div className="field-grid">
              {group.fields.map((field) => {
                const input = (
                  <FieldInput field={field} value={attrs[field.key]} onChange={(v) => setAttr(field.key, v)} />
                );
                const label = `${field.label}${field.unit ? ` (${field.unit})` : ''}`;
                // Chips são vários botões: dentro de <label>, clicar no texto ativaria o primeiro.
                return field.type === 'multiselect' ? (
                  <div key={field.key} className="field wide">
                    <span className="field-label">{label}</span>
                    {input}
                  </div>
                ) : (
                  <label key={field.key} className={field.type === 'textarea' ? 'wide' : ''}>
                    {label}
                    {input}
                  </label>
                );
              })}
            </div>
          </details>
        );
      })}

      {error && <p className="error">{error}</p>}
      <div className="actions sticky-actions">
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
