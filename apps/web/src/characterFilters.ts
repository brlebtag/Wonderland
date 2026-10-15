import type { Character } from './api';
import { normalize } from './text';
import { ageAt } from './timelineLayout';

/** Filtros da lista de personagens. '' = sem filtro; 'none' = "sem valor" (sem etnia, sem local...). */
export type CharacterFilters = {
  q: string;
  ethnicity: string;
  status: '' | 'alive' | 'dead';
  sex: string;
  place: string;
  ageMin: string;
  ageMax: string;
  sort: 'name' | 'age-asc' | 'age-desc' | 'birth';
};

export const NO_FILTERS: CharacterFilters = {
  q: '',
  ethnicity: '',
  status: '',
  sex: '',
  place: '',
  ageMin: '',
  ageMax: '',
  sort: 'name',
};

export const hasFilters = (f: CharacterFilters) =>
  (Object.keys(NO_FILTERS) as (keyof CharacterFilters)[]).some((k) => k !== 'sort' && f[k] !== '');

const attr = (c: Character, key: string) => c.attributes[key] as string | undefined;

/**
 * Idade do personagem: até o falecimento, se morreu; senão até os "dias atuais"
 * (evento mais recente da história). Sem data de nascimento não há idade.
 */
export function ageOf(c: Character, presentDate?: string) {
  const birth = attr(c, 'birthDate');
  const end = attr(c, 'deathDate') ?? presentDate;
  if (!birth || !end) return undefined;
  const age = ageAt(birth, end);
  return age >= 0 ? age : undefined;
}

/** 'none' casa com vazio; qualquer outro valor precisa ser igual. */
const matches = (filter: string, value: string | null | undefined) =>
  filter === '' || (filter === 'none' ? !value : value === filter);

export function filterCharacters(characters: Character[], f: CharacterFilters, presentDate?: string) {
  const q = normalize(f.q);
  const min = f.ageMin === '' ? undefined : Number(f.ageMin);
  const max = f.ageMax === '' ? undefined : Number(f.ageMax);

  const list = characters.filter((c) => {
    if (q && !normalize(`${c.name} ${c.nickname}`).includes(q)) return false;
    if (!matches(f.ethnicity, c.ethnicityId)) return false;
    if (!matches(f.sex, attr(c, 'sex'))) return false;
    if (!matches(f.place, c.birthLocationId)) return false;
    const dead = !!attr(c, 'deathDate');
    if (f.status === 'alive' && dead) return false;
    if (f.status === 'dead' && !dead) return false;
    if (min !== undefined || max !== undefined) {
      // faixa de idade só vale para quem tem idade calculável
      const age = ageOf(c, presentDate);
      if (age === undefined) return false;
      if (min !== undefined && age < min) return false;
      if (max !== undefined && age > max) return false;
    }
    return true;
  });

  const byName = (a: Character, b: Character) => a.name.localeCompare(b.name, 'pt-BR');
  // quem não tem o dado da ordenação vai para o fim
  const by = (get: (c: Character) => number | string | undefined, dir = 1) => (a: Character, b: Character) => {
    const x = get(a);
    const y = get(b);
    if (x === undefined || y === undefined) return x === y ? byName(a, b) : x === undefined ? 1 : -1;
    return x < y ? -dir : x > y ? dir : byName(a, b);
  };

  switch (f.sort) {
    case 'age-asc':
      return list.sort(by((c) => ageOf(c, presentDate)));
    case 'age-desc':
      return list.sort(by((c) => ageOf(c, presentDate), -1));
    case 'birth':
      return list.sort(by((c) => attr(c, 'birthDate')));
    default:
      return list.sort(byName);
  }
}
