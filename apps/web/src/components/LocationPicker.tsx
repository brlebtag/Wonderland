import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { MapLocation } from '@wonderland/shared';

type Props = {
  locations: MapLocation[];
  /** "kind:id" do lugar escolhido, ou '' (nenhum). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const keyOf = (l: MapLocation) => `${l.kind}:${l.id}`;

/** Sem acentos e em minúsculas, para a busca não depender de como o nome foi digitado. */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Escolha de um lugar do mapa digitando: o texto filtra as opções pelo nome (ou pelo tipo,
 * ex.: "cidade"); setas e Enter selecionam, Esc fecha, ✕ limpa.
 */
export function LocationPicker({ locations, value, onChange, placeholder = 'Digite para buscar um lugar…' }: Props) {
  const selected = locations.find((l) => keyOf(l) === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = normalize(query);
    return q
      ? locations.filter((l) => normalize(l.name).includes(q) || normalize(l.group).includes(q))
      : locations;
  }, [locations, query]);

  function pick(l: MapLocation) {
    onChange(keyOf(l));
    setQuery('');
    setOpen(false);
  }

  function move(delta: number) {
    if (!matches.length) return;
    const next = (active + delta + matches.length) % matches.length;
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      // nunca envia o formulário a partir da busca
      e.preventDefault();
      if (open && matches[active]) pick(matches[active]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setQuery('');
      setOpen(false);
    }
  }

  return (
    <div className="combo">
      <div className="combo-input">
        <input
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          // fechado: mostra o lugar escolhido; aberto: o que está sendo digitado
          value={open ? query : (selected?.name ?? '')}
          placeholder={selected ? selected.name : placeholder}
          onFocus={() => {
            setQuery('');
            setActive(Math.max(0, selected ? locations.indexOf(selected) : 0));
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {selected && (
          <button type="button" className="ghost" title="Limpar" onClick={() => onChange('')}>
            ✕
          </button>
        )}
      </div>
      {selected && !open && <span className="muted small">{selected.group}</span>}

      {open && (
        <ul className="combo-list" role="listbox" ref={listRef}>
          {matches.length === 0 && <li className="combo-empty muted">Nenhum lugar com esse nome.</li>}
          {matches.map((l, i) => (
            <li
              key={keyOf(l)}
              role="option"
              aria-selected={keyOf(l) === value}
              className={`combo-option ${i === active ? 'active' : ''} ${keyOf(l) === value ? 'selected' : ''}`}
              // mousedown (antes do blur do campo) para o clique não ser perdido
              onMouseDown={(e) => {
                e.preventDefault();
                pick(l);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{l.name}</span>
              <span className="muted small">{l.group}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
