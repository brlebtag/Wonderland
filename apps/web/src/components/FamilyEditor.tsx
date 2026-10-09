import { FAMILY_ROLES } from '@wonderland/shared';
import type { CharacterRef, RelationInput } from '../api';

type Props = {
  /** Nome do personagem da ficha (para a frase "X é pai de Fulano"). */
  characterName: string;
  /** Outros personagens da história que podem ser parentes. */
  candidates: CharacterRef[];
  value: RelationInput[];
  onChange: (relations: RelationInput[]) => void;
};

/** Lista editável de parentes: "<personagem> é <parentesco> de <este personagem>". */
export function FamilyEditor({ characterName, candidates, value, onChange }: Props) {
  const who = characterName.trim() || 'este personagem';
  const set = (i: number, patch: Partial<RelationInput>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  // cada parente aparece uma vez: some das opções das outras linhas
  const used = (i: number) => new Set(value.filter((_, j) => j !== i).map((r) => r.otherId));
  const free = candidates.filter((c) => !value.some((r) => r.otherId === c.id));

  return (
    <div className="family-editor">
      {value.length === 0 && <p className="muted">Nenhum parente vinculado.</p>}
      {value.map((r, i) => (
        <div key={i} className="family-row">
          <select value={r.otherId} onChange={(e) => set(i, { otherId: e.target.value })} required>
            <option value="" disabled>
              Escolha o personagem…
            </option>
            {candidates
              .filter((c) => !used(i).has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <span className="muted">é</span>
          <select value={r.role} onChange={(e) => set(i, { role: e.target.value })}>
            {FAMILY_ROLES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.neutral.toLowerCase()}
              </option>
            ))}
          </select>
          <span className="muted">de {who}</span>
          <button type="button" className="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} title="Remover">
            ✕
          </button>
        </div>
      ))}
      {candidates.length === 0 ? (
        <p className="muted small">Cadastre outros personagens nesta história para vinculá-los como parentes.</p>
      ) : (
        <button
          type="button"
          className="ghost"
          disabled={free.length === 0}
          onClick={() => onChange([...value, { otherId: free[0]?.id ?? '', role: 'parent' }])}
        >
          + Adicionar parente
        </button>
      )}
    </div>
  );
}
