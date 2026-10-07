import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const app = buildApp();
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

type WithId = { id: string };

async function post(url: string, payload: object) {
  const res = await app.inject({ method: 'POST', url, payload });
  expect(res.statusCode, res.body).toBe(201);
  return res.json();
}

const createStory = () => post('/api/stories', { title: 'História' });
const createCharacter = (storyId: string, payload: object) =>
  post(`/api/stories/${storyId}/characters`, payload);

describe('characters', () => {
  it('cria com ficha, descarta chaves desconhecidas e valores vazios', async () => {
    const story = await createStory();
    const character = await createCharacter(story.id, {
      name: 'Alice',
      nickname: 'Ali',
      attributes: {
        age: 7,
        sex: 'female',
        birthDate: '1858-05-04',
        bodyType: ['petite', 'slender'],
        isBlind: false,
        eyeColor: '',
        hairStyle: [],
        inventado: 'x',
      },
    });
    expect(character).toMatchObject({ name: 'Alice', nickname: 'Ali', deletedAt: null });
    expect(character.attributes).toEqual({
      age: 7,
      sex: 'female',
      birthDate: '1858-05-04',
      bodyType: ['petite', 'slender'],
      isBlind: false,
    });
  });

  it('valida opções e tipos da ficha', async () => {
    const story = await createStory();
    const url = `/api/stories/${story.id}/characters`;
    const bad = [
      { name: 'X', attributes: { bodyType: ['inexistente'] } },
      { name: 'X', attributes: { handedness: 'left-ish' } },
      { name: 'X', attributes: { age: 'sete' } },
      { name: 'X', attributes: { birthDate: '04/05/1858' } },
      { name: '  ' },
    ];
    for (const payload of bad) {
      const res = await app.inject({ method: 'POST', url, payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
    }
  });

  it('lista, atualiza (substituindo a ficha) e manda para a lixeira', async () => {
    const story = await createStory();
    const c = await createCharacter(story.id, { name: 'Chapeleiro', attributes: { age: 40 } });

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/characters/${c.id}`,
      payload: { attributes: { hairColor: 'ruivo' } },
    });
    expect(patched.json()).toMatchObject({ name: 'Chapeleiro', attributes: { hairColor: 'ruivo' } });
    expect(patched.json().attributes.age).toBeUndefined();

    const list = (await app.inject({ url: `/api/stories/${story.id}/characters` })).json();
    expect(list.map((x: WithId) => x.id)).toEqual([c.id]);

    await app.inject({ method: 'DELETE', url: `/api/characters/${c.id}` });
    expect((await app.inject({ url: `/api/characters/${c.id}` })).statusCode).toBe(404);
    expect((await app.inject({ url: `/api/stories/${story.id}/characters` })).json()).toEqual([]);
  });
});

describe('vínculo personagem ↔ evento', () => {
  it('vincula personagens e lista os eventos de cada um', async () => {
    const story = await createStory();
    const alice = await createCharacter(story.id, { name: 'Alice' });
    const coelho = await createCharacter(story.id, { name: 'Coelho' });

    const e1 = await post(`/api/stories/${story.id}/events`, {
      title: 'Toca',
      date: '1865-05-04',
      characterIds: [coelho.id, alice.id, alice.id],
    });
    expect(e1.characters).toEqual([
      { id: alice.id, name: 'Alice' },
      { id: coelho.id, name: 'Coelho' },
    ]);
    await post(`/api/stories/${story.id}/events`, {
      title: 'Chá',
      date: '1865-05-07',
      characterIds: [alice.id],
    });

    const aliceEvents = (await app.inject({ url: `/api/characters/${alice.id}/events` })).json();
    expect(aliceEvents.map((e: { title: string }) => e.title)).toEqual(['Toca', 'Chá']);
    const coelhoEvents = (await app.inject({ url: `/api/characters/${coelho.id}/events` })).json();
    expect(coelhoEvents.map((e: { title: string }) => e.title)).toEqual(['Toca']);

    // os eventos continuam na lista da história
    const all = (await app.inject({ url: `/api/stories/${story.id}/events` })).json();
    expect(all).toHaveLength(2);

    // PATCH substitui os vínculos
    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/events/${e1.id}`,
      payload: { characterIds: [coelho.id] },
    });
    expect(patched.json().characters).toEqual([{ id: coelho.id, name: 'Coelho' }]);
  });

  it('rejeita personagem de outra história ou inexistente', async () => {
    const story = await createStory();
    const other = await createStory();
    const stranger = await createCharacter(other.id, { name: 'Estranho' });
    for (const characterIds of [[stranger.id], ['nao-existe']]) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/stories/${story.id}/events`,
        payload: { title: 'X', date: '2000-01-01', characterIds },
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('personagem na lixeira some dos eventos', async () => {
    const story = await createStory();
    const c = await createCharacter(story.id, { name: 'Gato' });
    const e = await post(`/api/stories/${story.id}/events`, {
      title: 'Sorriso',
      date: '1865-05-07',
      characterIds: [c.id],
    });
    await app.inject({ method: 'DELETE', url: `/api/characters/${c.id}` });
    const events = (await app.inject({ url: `/api/stories/${story.id}/events` })).json();
    expect(events.find((x: WithId) => x.id === e.id).characters).toEqual([]);
  });
});
