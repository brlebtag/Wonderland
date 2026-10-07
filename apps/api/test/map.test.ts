import { afterAll, describe, expect, it } from 'vitest';
import { createEmptyMap, type MapData } from '@wonderland/shared';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const app = buildApp();
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function req(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) {
  return app.inject({ method, url, payload });
}
async function ok(method: 'POST' | 'PUT' | 'PATCH', url: string, payload: object) {
  const res = await req(method, url, payload);
  expect(res.statusCode, res.body).toBeLessThan(300);
  return res.json();
}

const createStory = () => ok('POST', '/api/stories', { title: 'Mapa' });

/** Mapa 10x10: metade de cima terra (região "Norte"), com uma cidade e um território. */
function sampleMap(ethnicityId: string | null = null): MapData {
  return {
    ...createEmptyMap(10, 10),
    terrain: '1*50,0*50',
    regionGrid: '5*50,0*50',
    regions: [{ id: 'reg-norte', code: 5, name: 'Norte', color: '#aa3322', ethnicityId }],
    features: [{ id: 'f-capital', type: 'city', name: 'Capital', x: 2, y: 2, size: 2 }],
    paths: [
      { id: 'p-rio', type: 'river', name: 'Rio', points: [[0, 0], [5, 5]] },
      { id: 'p-serra', type: 'mountains', name: 'Serra', points: [[1, 1], [8, 1]], size: 1.5 },
    ],
    territories: [
      { id: 't-tribo', name: 'Tribo', ethnicityId, shape: { kind: 'circle', cx: 5, cy: 5, r: 3 } },
    ],
  };
}

describe('etnias', () => {
  it('CRUD com lixeira', async () => {
    const story = await createStory();
    const e = await ok('POST', `/api/stories/${story.id}/ethnicities`, {
      name: 'Povo do Rio',
      kind: 'Tribo',
      color: '#228844',
    });
    expect(e).toMatchObject({ name: 'Povo do Rio', kind: 'Tribo', color: '#228844', description: '' });

    const bad = await req('POST', `/api/stories/${story.id}/ethnicities`, { name: 'X', color: 'verde' });
    expect(bad.statusCode).toBe(400);

    await ok('PATCH', `/api/ethnicities/${e.id}`, { description: 'Nômades' });
    expect((await req('GET', `/api/stories/${story.id}/ethnicities`)).json()).toHaveLength(1);

    await req('DELETE', `/api/ethnicities/${e.id}`);
    expect((await req('GET', `/api/stories/${story.id}/ethnicities`)).json()).toEqual([]);
    const trash = (await req('GET', `/api/stories/${story.id}/trash`)).json();
    expect(trash.ethnicities.map((x: { id: string }) => x.id)).toEqual([e.id]);

    await ok('POST', `/api/ethnicities/${e.id}/restore`, {});
    expect((await req('GET', `/api/stories/${story.id}/ethnicities`)).json()).toHaveLength(1);
  });

  it('vincula a personagem; excluir de vez deixa o personagem sem etnia', async () => {
    const story = await createStory();
    const other = await createStory();
    const e = await ok('POST', `/api/stories/${story.id}/ethnicities`, { name: 'Reino' });
    const foreign = await ok('POST', `/api/stories/${other.id}/ethnicities`, { name: 'Estrangeiro' });

    const c = await ok('POST', `/api/stories/${story.id}/characters`, { name: 'Rei', ethnicityId: e.id });
    expect(c.ethnicityId).toBe(e.id);
    const wrong = await req('POST', `/api/stories/${story.id}/characters`, {
      name: 'X',
      ethnicityId: foreign.id,
    });
    expect(wrong.statusCode).toBe(400);

    await req('DELETE', `/api/ethnicities/${e.id}`);
    expect((await req('DELETE', `/api/ethnicities/${e.id}/permanent`)).statusCode).toBe(204);
    expect((await req('GET', `/api/characters/${c.id}`)).json().ethnicityId).toBeNull();
  });
});

describe('mapa', () => {
  it('começa vazio, salva e devolve o documento', async () => {
    const story = await createStory();
    expect((await req('GET', `/api/stories/${story.id}/map`)).json().data).toBeNull();

    const e = await ok('POST', `/api/stories/${story.id}/ethnicities`, { name: 'Tribo' });
    const saved = await ok('PUT', `/api/stories/${story.id}/map`, { data: sampleMap(e.id) });
    expect(saved.clearedEvents).toBe(0);
    expect((await req('GET', `/api/stories/${story.id}/map`)).json().data).toEqual(sampleMap(e.id));
  });

  it('rejeita documento inconsistente', async () => {
    const story = await createStory();
    const base = sampleMap();
    const invalid: Partial<MapData>[] = [
      { terrain: '1*10' }, // tamanho errado
      { terrain: '9*100' }, // terreno inexistente
      { regionGrid: '6*100' }, // região inexistente
      { features: [{ id: 'reg-norte', type: 'city', name: 'Dup', x: 0, y: 0 }] }, // id repetido
      { regions: [{ ...base.regions[0], ethnicityId: 'nao-existe' }] }, // etnia de fora
      { features: [{ ...base.features[0], size: 10 }] }, // tamanho fora do limite
    ];
    for (const patch of invalid) {
      const res = await req('PUT', `/api/stories/${story.id}/map`, { data: { ...base, ...patch } });
      expect(res.statusCode, JSON.stringify(patch)).toBe(400);
    }
  });
});

describe('local dos eventos', () => {
  it('aceita só locais que existem no mapa e limpa os removidos', async () => {
    const story = await createStory();
    const semMapa = await req('POST', `/api/stories/${story.id}/events`, {
      title: 'X',
      date: '2000-01-01',
      location: { kind: 'feature', id: 'f-capital' },
    });
    expect(semMapa.statusCode).toBe(400);

    await ok('PUT', `/api/stories/${story.id}/map`, { data: sampleMap() });
    const naCapital = await ok('POST', `/api/stories/${story.id}/events`, {
      title: 'Coroação',
      date: '2000-01-01',
      location: { kind: 'feature', id: 'f-capital' },
    });
    expect(naCapital).toMatchObject({ locationKind: 'feature', locationId: 'f-capital' });
    const noNorte = await ok('POST', `/api/stories/${story.id}/events`, {
      title: 'Batalha',
      date: '2001-01-01',
      location: { kind: 'region', id: 'reg-norte' },
    });

    // tipo errado para o id, ou id inexistente
    for (const location of [{ kind: 'region', id: 'f-capital' }, { kind: 'feature', id: 'nada' }]) {
      const res = await req('PATCH', `/api/events/${naCapital.id}`, { location });
      expect(res.statusCode).toBe(400);
    }

    // remover a cidade do mapa tira o local do evento que apontava para ela
    const semCapital = { ...sampleMap(), features: [] };
    const saved = await ok('PUT', `/api/stories/${story.id}/map`, { data: semCapital });
    expect(saved.clearedEvents).toBe(1);
    const events = (await req('GET', `/api/stories/${story.id}/events`)).json();
    expect(events.find((e: { id: string }) => e.id === naCapital.id).locationId).toBeNull();
    expect(events.find((e: { id: string }) => e.id === noNorte.id).locationId).toBe('reg-norte');

    // linhas (rios, estradas, cordilheiras) também são locais
    const noRio = await ok('PATCH', `/api/events/${noNorte.id}`, { location: { kind: 'path', id: 'p-rio' } });
    expect(noRio).toMatchObject({ locationKind: 'path', locationId: 'p-rio' });

    // e dá para tirar o local explicitamente
    const cleared = await ok('PATCH', `/api/events/${noNorte.id}`, { location: null });
    expect(cleared.locationKind).toBeNull();
  });

  it('excluir a história de vez remove etnias e mapa', async () => {
    const story = await createStory();
    await ok('POST', `/api/stories/${story.id}/ethnicities`, { name: 'Reino' });
    await ok('PUT', `/api/stories/${story.id}/map`, { data: sampleMap() });
    await req('DELETE', `/api/stories/${story.id}`);
    expect((await req('DELETE', `/api/stories/${story.id}/permanent`)).statusCode).toBe(204);
    expect(await prisma.ethnicity.count({ where: { storyId: story.id } })).toBe(0);
    expect(await prisma.storyMap.count({ where: { storyId: story.id } })).toBe(0);
  });
});
