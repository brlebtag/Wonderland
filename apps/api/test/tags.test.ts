import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const app = buildApp();
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function post(url: string, payload: object) {
  const res = await app.inject({ method: 'POST', url, payload });
  expect(res.statusCode, res.body).toBe(201);
  return res.json();
}

const createStory = () => post('/api/stories', { title: 'História' });
const listTags = async (storyId: string) => (await app.inject({ url: `/api/stories/${storyId}/tags` })).json();

describe('tags', () => {
  it('personagens criam as tags que faltam e reaproveitam as existentes', async () => {
    const story = await createStory();
    const ana = await post(`/api/stories/${story.id}/characters`, { name: 'Ana', tags: ['Protagonista', 'nobre'] });
    const bento = await post(`/api/stories/${story.id}/characters`, { name: 'Bento', tags: ['protagonista', 'Vilão'] });
    expect(ana.tags).toEqual(['nobre', 'Protagonista']);
    expect(bento.tags).toEqual(['Protagonista', 'Vilão']);

    const tags = await listTags(story.id);
    expect(tags.map((t: { name: string; characterCount: number }) => [t.name, t.characterCount])).toEqual([
      ['nobre', 1],
      ['Protagonista', 2],
      ['Vilão', 1],
    ]);
  });

  it('cria, renomeia e recusa nomes repetidos', async () => {
    const story = await createStory();
    const url = `/api/stories/${story.id}/tags`;
    const mentor = await post(url, { name: '  Mentor ' });
    expect(mentor.name).toBe('Mentor');
    await post(url, { name: 'Rival' });

    expect((await app.inject({ method: 'POST', url, payload: { name: 'mentor' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url, payload: { name: '  ' } })).statusCode).toBe(400);
    const clash = await app.inject({ method: 'PATCH', url: `/api/tags/${mentor.id}`, payload: { name: 'RIVAL' } });
    expect(clash.statusCode).toBe(400);

    const c = await post(`/api/stories/${story.id}/characters`, { name: 'Caio', tags: ['Mentor'] });
    const renamed = await app.inject({ method: 'PATCH', url: `/api/tags/${mentor.id}`, payload: { name: 'Mestre' } });
    expect(renamed.json().name).toBe('Mestre');
    expect((await app.inject({ url: `/api/characters/${c.id}` })).json().tags).toEqual(['Mestre']);
  });

  it('apagar uma tag tira o vínculo, mas nunca apaga o personagem', async () => {
    const story = await createStory();
    const c = await post(`/api/stories/${story.id}/characters`, { name: 'Davi', tags: ['coadjuvante', 'nobre'] });
    const tag = (await listTags(story.id)).find((t: { name: string }) => t.name === 'coadjuvante');

    expect((await app.inject({ method: 'DELETE', url: `/api/tags/${tag.id}` })).statusCode).toBe(204);
    const after = await app.inject({ url: `/api/characters/${c.id}` });
    expect(after.statusCode).toBe(200);
    expect(after.json().tags).toEqual(['nobre']);
    expect((await listTags(story.id)).map((t: { name: string }) => t.name)).toEqual(['nobre']);
  });

  it('personagem na lixeira não conta na tag', async () => {
    const story = await createStory();
    const c = await post(`/api/stories/${story.id}/characters`, { name: 'Eva', tags: ['nobre'] });
    await app.inject({ method: 'DELETE', url: `/api/characters/${c.id}` });
    expect((await listTags(story.id))[0].characterCount).toBe(0);
  });
});
