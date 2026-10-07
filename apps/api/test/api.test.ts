import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const app = buildApp();
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

type WithId = { id: string };

async function createStory(title = 'Minha história') {
  const res = await app.inject({ method: 'POST', url: '/api/stories', payload: { title } });
  expect(res.statusCode).toBe(201);
  return res.json();
}

async function createEvent(storyId: string, title: string, date: string) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/stories/${storyId}/events`,
    payload: { title, date, description: `Descrição de ${title}` },
  });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe('stories', () => {
  it('cria, lista, busca e atualiza', async () => {
    const story = await createStory('Alice');
    expect(story).toMatchObject({ title: 'Alice', description: '', deletedAt: null });

    const list = (await app.inject({ url: '/api/stories' })).json();
    expect(list.map((s: WithId) => s.id)).toContain(story.id);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/stories/${story.id}`,
      payload: { description: 'No país das maravilhas' },
    });
    expect(patched.json()).toMatchObject({ title: 'Alice', description: 'No país das maravilhas' });
  });

  it('valida a entrada', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/stories', payload: { title: '  ' } });
    expect(res.statusCode).toBe(400);
  });

  it('soft delete esconde a história e restore traz de volta', async () => {
    const story = await createStory();
    const del = await app.inject({ method: 'DELETE', url: `/api/stories/${story.id}` });
    expect(del.statusCode).toBe(204);

    expect((await app.inject({ url: `/api/stories/${story.id}` })).statusCode).toBe(404);
    const list = (await app.inject({ url: '/api/stories' })).json();
    expect(list.map((s: WithId) => s.id)).not.toContain(story.id);
    expect(await prisma.story.findUnique({ where: { id: story.id } })).not.toBeNull();

    const restored = await app.inject({ method: 'POST', url: `/api/stories/${story.id}/restore` });
    expect(restored.statusCode).toBe(200);
    expect((await app.inject({ url: `/api/stories/${story.id}` })).statusCode).toBe(200);
  });
});

describe('events', () => {
  it('lista os eventos ordenados por data', async () => {
    const story = await createStory();
    await createEvent(story.id, 'Fim', '2020-12-31');
    await createEvent(story.id, 'Início', '2020-01-01');
    await createEvent(story.id, 'Meio', '2020-06-15');

    const events = (await app.inject({ url: `/api/stories/${story.id}/events` })).json();
    expect(events.map((e: { title: string }) => e.title)).toEqual(['Início', 'Meio', 'Fim']);
    expect(events[0].date).toBe('2020-01-01T00:00:00.000Z');
  });

  it('rejeita data inválida', async () => {
    const story = await createStory();
    const res = await app.inject({
      method: 'POST',
      url: `/api/stories/${story.id}/events`,
      payload: { title: 'X', date: '01/02/2020' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('atualiza e faz soft delete de um evento', async () => {
    const story = await createStory();
    const event = await createEvent(story.id, 'Chegada', '2021-03-01');

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      payload: { date: '2021-04-01' },
    });
    expect(patched.json()).toMatchObject({ title: 'Chegada', date: '2021-04-01T00:00:00.000Z' });

    const del = await app.inject({ method: 'DELETE', url: `/api/events/${event.id}` });
    expect(del.statusCode).toBe(204);
    expect((await app.inject({ url: `/api/stories/${story.id}/events` })).json()).toEqual([]);
    const again = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      payload: { title: 'Y' },
    });
    expect(again.statusCode).toBe(404);
  });

  it('eventos somem com a história apagada e voltam ao restaurar', async () => {
    const story = await createStory();
    const kept = await createEvent(story.id, 'Mantido', '2022-01-01');
    const removed = await createEvent(story.id, 'Removido', '2022-02-01');
    await app.inject({ method: 'DELETE', url: `/api/events/${removed.id}` });

    await app.inject({ method: 'DELETE', url: `/api/stories/${story.id}` });
    expect((await app.inject({ url: `/api/stories/${story.id}/events` })).statusCode).toBe(404);
    const patchHidden = await app.inject({
      method: 'PATCH',
      url: `/api/events/${kept.id}`,
      payload: { title: 'Z' },
    });
    expect(patchHidden.statusCode).toBe(404);

    await app.inject({ method: 'POST', url: `/api/stories/${story.id}/restore` });
    const events = (await app.inject({ url: `/api/stories/${story.id}/events` })).json();
    expect(events.map((e: WithId) => e.id)).toEqual([kept.id]);
  });
});
