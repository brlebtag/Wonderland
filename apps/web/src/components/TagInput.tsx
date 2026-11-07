import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cleanTag, MAX_TAGS, tagKey } from '@wonderland/shared';

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags oferecidas no autocompletar (as já escolhidas somem da lista). */
  suggestions: string[];
  /** Permite criar uma tag nova com o que foi digitado (Enter ou vírgula). */
  allowCreate?: boolean;
  placeholder?: string;
};

/**
 * Campo de tags: digitar filtra as sugestões; Enter/clique escolhe, vírgula também adiciona,
 * Backspace com o campo vazio tira a última, ✕ tira uma.
 */
export function TagInput({ value, onChange, suggestions, allowCreate = false, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Última lista enviada: o pai pode demorar a devolver o novo valor (ex.: filtros na URL),
  // e escolher duas tags em seguida não pode perder a primeira.
  const latest = useRef(value);
  const lastProp = useRef(value);
  if (value !== lastProp.current) latest.current = lastProp.current = value;
  const emit = (tags: string[]) => {
    latest.current = tags;
    onChange(tags);
  };

  const chosen = useMemo(() => new Set(value.map(tagKey)), [value]);
  const typed = cleanTag(query);
  const options = useMemo(() => {
    const q = tagKey(query);
    const list = suggestions.filter((s) => !chosen.has(tagKey(s)) && tagKey(s).includes(q));
    // "criar" só quando o texto não é exatamente uma tag existente nem já escolhida
    const exists = suggestions.some((s) => tagKey(s) === q) || chosen.has(q);
    const create = allowCreate && q !== '' && !exists && value.length < MAX_TAGS;
    return create ? [...list, { create: typed }] : list;
  }, [suggestions, chosen, query, typed, allowCreate, value.length]);

  function add(tag: string) {
    const t = cleanTag(tag);
    const cur = latest.current;
    if (t && !cur.some((x) => tagKey(x) === tagKey(t)) && cur.length < MAX_TAGS) emit([...cur, t]);
    setQuery('');
    setActive(0);
  }

  const pick = (o: (typeof options)[number]) => add(typeof o === 'string' ? o : o.create);

  function move(delta: number) {
    if (!options.length) return;
    const next = (active + delta + options.length) % options.length;
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
    } else if (e.key === 'Enter' || (e.key === ',' && allowCreate)) {
      // nunca envia o formulário a partir do campo de tags
      e.preventDefault();
      if (open && options[active]) pick(options[active]);
      else if (allowCreate && typed) add(typed);
    } else if (e.key === 'Backspace' && query === '' && value.length) {
      emit(latest.current.slice(0, -1));
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="combo">
      <div className="tag-input" onClick={() => inputRef.current?.focus()}>
        {value.map((t) => (
          <span key={tagKey(t)} className="tag">
            {t}
            <button
              type="button"
              className="tag-remove"
              title={`Tirar "${t}"`}
              onClick={(e) => {
                e.stopPropagation();
                emit(latest.current.filter((x) => x !== t));
              }}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={query}
          placeholder={value.length ? '' : placeholder}
          onFocus={() => setOpen(true)}
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
      </div>

      {open && (options.length > 0 || query) && (
        <ul className="combo-list" role="listbox" ref={listRef}>
          {options.length === 0 && <li className="combo-empty muted">Nenhuma tag com esse nome.</li>}
          {options.map((o, i) => (
            <li
              key={typeof o === 'string' ? tagKey(o) : '\u0000create'}
              role="option"
              aria-selected={i === active}
              className={`combo-option ${i === active ? 'active' : ''}`}
              // mousedown (antes do blur do campo) para o clique não ser perdido
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {typeof o === 'string' ? (
                <span>{o}</span>
              ) : (
                <span>
                  Criar tag “<strong>{o.create}</strong>”
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tags usadas pelos personagens (uma grafia por tag), em ordem alfabética. */
export function tagsInUse(characters: { tags: string[] }[]) {
  const byKey = new Map<string, string>();
  for (const c of characters) for (const t of c.tags) if (!byKey.has(tagKey(t))) byKey.set(tagKey(t), t);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Lista de tags (só leitura). */
export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <span className="tags">
      {tags.map((t) => (
        <span key={tagKey(t)} className="tag">
          {t}
        </span>
      ))}
    </span>
  );
}
