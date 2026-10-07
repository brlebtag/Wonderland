import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const app = buildApp();
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

type WithId = { id: string };

async function post(url: string, payload: object = {}) {
  const res = await app.inject({ method: 'POST', url, payload });
  expect(res.statusCode, res.body).toBeLessThan(300);
  return res.json();
}
const del = (url: string) => app.inject({ method: 'DELETE', url });
const get = (url: string) => app.inject({ url });

async function storyWithContent() {
  const story = await post('/api/stories', { title: 'Lixeira' });
  const character = await post(`/api/stories/${story.id}/characters`, { name: 'Gato' });
  const event = await post(`/api/stories/${story.id}/events`, {
    title: 'Sorriso',
    date: '1865-05-07',
    characterIds: [character.id],
  });
  return { story, character, event };
}

describe('lixeira de histórias', () => {
  it('lista histórias apagadas com contagem e restaura', async () => {
    const { story } = await storyWithContent();
    await del(`/api/stories/${story.id}`);

    const trash = (await get('/api/trash/stories')).json();
    const item = trash.find((s: WithId) => s.id === story.id);
    expect(item._count).toEqual({ events: 1, characters: 1, ethnicities: 0 });
    expect(item.deletedAt).not.toBeNull();

    await post(`/api/stories/${story.id}/restore`);
    expect((await get('/api/trash/stories')).json().map((s: WithId) => s.id)).not.toContain(story.id);
  });

  it('remove permanentemente a história com eventos e personagens', async () => {
    const { story, character, event } = await storyWithContent();

    // fora da lixeira não pode
    expect((await del(`/api/stories/${story.id}/permanent`)).statusCode).toBe(404);

    await del(`/api/stories/${story.id}`);
    expect((await del(`/api/stories/${story.id}/permanent`)).statusCode).toBe(204);

    expect(await prisma.story.findUnique({ where: { id: story.id } })).toBeNull();
    expect(await prisma.event.findUnique({ where: { id: event.id } })).toBeNull();
    expect(await prisma.character.findUnique({ where: { id: character.id } })).toBeNull();
  });
});

describe('lixeira da história (eventos e personagens)', () => {
  it('lista, restaura e remove permanentemente eventos', async () => {
    const { story, event } = await storyWithContent();
    // fora da lixeira não pode restaurar
    expect((await app.inject({ method: 'POST', url: `/api/events/${event.id}/restore` })).statusCode).toBe(404);

    await del(`/api/events/${event.id}`);
    const trash = (await get(`/api/stories/${story.id}/trash`)).json();
    expect(trash.events.map((e: WithId) => e.id)).toEqual([event.id]);

    const restored = await post(`/api/events/${event.id}/restore`);
    expect(restored.characters.map((c: { name: string }) => c.name)).toEqual(['Gato']);
    expect((await get(`/api/stories/${story.id}/events`)).json()).toHaveLength(1);

    await del(`/api/events/${event.id}`);
    expect((await del(`/api/events/${event.id}/permanent`)).statusCode).toBe(204);
    expect(await prisma.event.findUnique({ where: { id: event.id } })).toBeNull();
    expect((await get(`/api/stories/${story.id}/trash`)).json().events).toEqual([]);
  });

  it('restaura personagem com os vínculos, mesmo após editar o evento', async () => {
    const { story, character, event } = await storyWithContent();
    await del(`/api/characters/${character.id}`);
    expect((await get(`/api/stories/${story.id}/trash`)).json().characters.map((c: WithId) => c.id)).toEqual([
      character.id,
    ]);

    // editar o evento sem o personagem (o formulário não o vê) não pode desfazer o vínculo
    await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      payload: { characterIds: [] },
    });

    await post(`/api/characters/${character.id}/restore`);
    const events = (await get(`/api/characters/${character.id}/events`)).json();
    expect(events.map((e: WithId) => e.id)).toEqual([event.id]);
  });

  it('remove personagem permanentemente sem apagar os eventos', async () => {
    const { story, character, event } = await storyWithContent();
    expect((await del(`/api/characters/${character.id}/permanent`)).statusCode).toBe(404);

    await del(`/api/characters/${character.id}`);
    expect((await del(`/api/characters/${character.id}/permanent`)).statusCode).toBe(204);

    expect(await prisma.character.findUnique({ where: { id: character.id } })).toBeNull();
    const events = (await get(`/api/stories/${story.id}/events`)).json();
    expect(events.map((e: WithId) => e.id)).toEqual([event.id]);
  });

  it('itens de uma história apagada não aparecem nem podem ser removidos', async () => {
    const { story, event } = await storyWithContent();
    await del(`/api/events/${event.id}`);
    await del(`/api/stories/${story.id}`);
    expect((await get(`/api/stories/${story.id}/trash`)).statusCode).toBe(404);
    expect((await del(`/api/events/${event.id}/permanent`)).statusCode).toBe(404);
  });
});
