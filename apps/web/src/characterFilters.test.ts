import { describe, expect, it } from 'vitest';
import type { Character } from './api';
import { ageOf, filterCharacters, hasFilters, NO_FILTERS } from './characterFilters';

const present = '2000-06-01T00:00:00.000Z';

const mk = (name: string, extra: Partial<Character> = {}, attributes: Character['attributes'] = {}): Character => ({
  id: name,
  storyId: 's',
  name,
  nickname: '',
  attributes,
  ethnicityId: null,
  birthLocationKind: null,
  birthLocationId: null,
  createdAt: '',
  updatedAt: '',
  ...extra,
});

const ana = mk('Ana', { ethnicityId: 'reino', birthLocationId: 'capital' }, { sex: 'female', birthDate: '1980-01-01' });
const bento = mk('Bento', { ethnicityId: 'tribo', nickname: 'Lobo' }, { sex: 'male', birthDate: '1950-01-01', deathDate: '1990-01-01' });
const cecilia = mk('Cecília', {}, { birthDate: '1995-03-01' });
const davi = mk('Davi');
const all = [davi, cecilia, bento, ana];

const names = (f: Partial<typeof NO_FILTERS>) =>
  filterCharacters([...all], { ...NO_FILTERS, ...f }, present).map((c) => c.name);

describe('ageOf', () => {
  it('conta até os dias atuais, ou até o falecimento', () => {
    expect(ageOf(ana, present)).toBe(20);
    expect(ageOf(bento, present)).toBe(40);
    expect(ageOf(davi, present)).toBeUndefined();
  });
});

describe('filterCharacters', () => {
  it('sem filtros lista todos por nome', () => {
    expect(names({})).toEqual(['Ana', 'Bento', 'Cecília', 'Davi']);
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, status: 'dead' })).toBe(true);
  });

  it('busca por nome ou apelido, sem depender de acento', () => {
    expect(names({ q: 'cecilia' })).toEqual(['Cecília']);
    expect(names({ q: 'LOBO' })).toEqual(['Bento']);
  });

  it('filtra por etnia, sexo e local de nascimento, incluindo "sem"', () => {
    expect(names({ ethnicity: 'reino' })).toEqual(['Ana']);
    expect(names({ ethnicity: 'none' })).toEqual(['Cecília', 'Davi']);
    expect(names({ sex: 'male' })).toEqual(['Bento']);
    expect(names({ sex: 'none' })).toEqual(['Cecília', 'Davi']);
    expect(names({ place: 'capital' })).toEqual(['Ana']);
    expect(names({ place: 'none' })).toEqual(['Bento', 'Cecília', 'Davi']);
  });

  it('filtra vivos e falecidos', () => {
    expect(names({ status: 'dead' })).toEqual(['Bento']);
    expect(names({ status: 'alive' })).toEqual(['Ana', 'Cecília', 'Davi']);
  });

  it('faixa de idade ignora quem não tem idade calculável', () => {
    expect(names({ ageMin: '18' })).toEqual(['Ana', 'Bento']);
    expect(names({ ageMax: '18' })).toEqual(['Cecília']);
    expect(names({ ageMin: '10', ageMax: '30' })).toEqual(['Ana']);
  });

  it('combina filtros e ordena por idade (sem idade vai para o fim)', () => {
    expect(names({ status: 'alive', ageMin: '1' })).toEqual(['Ana', 'Cecília']);
    expect(names({ sort: 'age-asc' })).toEqual(['Cecília', 'Ana', 'Bento', 'Davi']);
    expect(names({ sort: 'age-desc' })).toEqual(['Bento', 'Ana', 'Cecília', 'Davi']);
    expect(names({ sort: 'birth' })).toEqual(['Bento', 'Ana', 'Cecília', 'Davi']);
  });
});
