import type { ReactNode } from 'react';
import { formatDateTime } from '../api';

type Props = {
  title: ReactNode;
  details?: ReactNode;
  deletedAt: string;
  /** Nome usado nas confirmações. */
  name: string;
  /** O que mais some junto na remoção permanente (ex.: "e seus 12 eventos"). */
  purgeAlso?: string;
  onRestore: () => void;
  onPurge: () => void;
};

/** Item da lixeira com as ações "Restaurar" e "Excluir permanentemente". */
export function TrashItem({ title, details, deletedAt, name, purgeAlso, onRestore, onPurge }: Props) {
  return (
    <li className="card story-item trash-item">
      <div>
        <div className="story-title">{title}</div>
        {details && <div className="muted">{details}</div>}
        <small className="muted">Na lixeira desde {formatDateTime(deletedAt)}</small>
      </div>
      <div className="actions">
        <button className="ghost" onClick={onRestore}>
          Restaurar
        </button>
        <button
          className="danger"
          onClick={() => {
            const also = purgeAlso ? ` ${purgeAlso}` : '';
            if (confirm(`Excluir "${name}"${also} permanentemente?\n\nIsso não pode ser desfeito.`)) onPurge();
          }}
        >
          Excluir permanentemente
        </button>
      </div>
    </li>
  );
}
