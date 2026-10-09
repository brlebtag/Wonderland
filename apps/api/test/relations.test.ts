import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const app = buildApp();
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function ok(method: 'POST' | 'PUT', url: string, payload: object) {
  const res = await app.inject({ method, url, payload });
  expect(res.statusCode, res.body).toBeLessThan(300);
  return res.json();
}
const get = async (url: string) => (await app.inject({ url })).json();
const put = (id: string, relations: object[]) =>
  app.inject({ method: 'PUT', url: `/api/characters/${id}/relations`, payload: { relations } });

type Rel = { role: string; other: { id: string; name: string } };
const view = (rels: Rel[]) => rels.map((r) => `${r.other.name}:${r.role}`).sort();

async function family() {
  const story = await ok('POST', '/api/stories', { title: 'Família' });
  const mk = (name: string, sex: string) =>
    ok('POST', `/api/stories/${story.id}/characters`, { name, attributes: { sex } });
  return { story, ana: await mk('Ana', 'female'), pedro: await mk('Pedro', 'male'), lia: await mk('Lia', 'female') };
}

describe('parentescos', () => {
  it('um vínculo aparece dos dois lados, com o papel invertido', async () => {
    const { ana, pedro } = await family();
    // na ficha da Ana: Pedro é pai dela
    expect((await put(ana.id, [{ otherId: pedro.id, role: 'parent' }])).statusCode).toBe(200);

    expect(view(await get(`/api/characters/${ana.id}/relations`))).toEqual(['Pedro:parent']);
    // na ficha do Pedro: Ana é filha dele
    const pedroRels = await get(`/api/characters/${pedro.id}/relations`);
    expect(view(pedroRels)).toEqual(['Ana:child']);
    expect(pedroRels[0].other.sex).toBe('female');
    expect(await prisma.characterRelation.count({ where: { characterId: { in: [ana.id, pedro.id] } } })).toBe(1);
  });

  it('salvar pelo outro lado substitui o vínculo sem duplicar', async () => {
    const { ana, pedro, lia } = await family();
    await put(ana.id, [{ otherId: pedro.id, role: 'parent' }]);
    // na ficha do Pedro: Ana continua filha e Lia é esposa
    await put(pedro.id, [
      { otherId: ana.id, role: 'child' },
      { otherId: lia.id, role: 'spouse' },
    ]);
    expect(view(await get(`/api/characters/${ana.id}/relations`))).toEqual(['Pedro:parent']);
    expect(view(await get(`/api/characters/${lia.id}/relations`))).toEqual(['Pedro:spouse']);
    const total = await prisma.characterRelation.count({
      where: { OR: [{ characterId: { in: [ana.id, pedro.id, lia.id] } }] },
    });
    expect(total).toBe(2);

    // remover pela ficha da Ana
    await put(ana.id, []);
    expect(view(await get(`/api/characters/${pedro.id}/relations`))).toEqual(['Lia:spouse']);
  });

  it('valida parentes', async () => {
    const { ana, pedro } = await family();
    const other = await family();
    const invalid = [
      [{ otherId: ana.id, role: 'parent' }], // ela mesma
      [{ otherId: pedro.id, role: 'parent' }, { otherId: pedro.id, role: 'sibling' }], // repetido
      [{ otherId: other.pedro.id, role: 'parent' }], // de outra história
      [{ otherId: pedro.id, role: 'chefe' }], // papel inexistente
    ];
    for (const relations of invalid) {
      expect((await put(ana.id, relations)).statusCode, JSON.stringify(relations)).toBe(400);
    }
  });

  it('parente na lixeira some da ficha, mas o vínculo volta ao restaurar', async () => {
    const { ana, pedro, lia } = await family();
    await put(ana.id, [
      { otherId: pedro.id, role: 'parent' },
      { otherId: lia.id, role: 'sibling' },
    ]);
    await app.inject({ method: 'DELETE', url: `/api/characters/${lia.id}` });
    expect(view(await get(`/api/characters/${ana.id}/relations`))).toEqual(['Pedro:parent']);

    // salvar a ficha da Ana sem a Lia (que o formulário não vê) não apaga o vínculo
    await put(ana.id, [{ otherId: pedro.id, role: 'parent' }]);
    await ok('POST', `/api/characters/${lia.id}/restore`, {});
    expect(view(await get(`/api/characters/${ana.id}/relations`))).toEqual(['Lia:sibling', 'Pedro:parent']);

    // excluir de vez remove o vínculo
    await app.inject({ method: 'DELETE', url: `/api/characters/${lia.id}` });
    await app.inject({ method: 'DELETE', url: `/api/characters/${lia.id}/permanent` });
    expect(await prisma.characterRelation.count({ where: { relatedId: lia.id } })).toBe(0);
  });

  it('aceita data de falecimento e os novos campos da ficha', async () => {
    const { story } = await family();
    const c = await ok('POST', `/api/stories/${story.id}/characters`, {
      name: 'Avô',
      attributes: { birthDate: '1900-01-01', deathDate: '1980-05-02', goals: 'x', desires: 'y', trivia: 'z' },
    });
    expect(c.attributes).toMatchObject({ deathDate: '1980-05-02', goals: 'x', desires: 'y', trivia: 'z' });
  });
});
