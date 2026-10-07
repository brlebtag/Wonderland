import { prisma } from '../../db';
import type { EventCreate, EventUpdate } from './schemas';

// Um evento só é visível se ele e a sua história não estiverem apagados.
const alive = { deletedAt: null, story: { deletedAt: null } };

// Todo evento sai com os personagens (vivos) vinculados.
const include = {
  characters: {
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' as const },
  },
};

const orderBy = [{ date: 'asc' as const }, { createdAt: 'asc' as const }];
const toConnect = (ids: string[]) => ids.map((id) => ({ id }));

export const eventRepository = {
  listByStory: (storyId: string) =>
    prisma.event.findMany({ where: { storyId, ...alive }, include, orderBy }),
  listByCharacter: (characterId: string) =>
    prisma.event.findMany({
      where: { ...alive, characters: { some: { id: characterId } } },
      include,
      orderBy,
    }),
  findById: (id: string) => prisma.event.findFirst({ where: { id, ...alive }, include }),
  create: (storyId: string, { characterIds, ...data }: EventCreate) =>
    prisma.event.create({
      data: { ...data, storyId, characters: { connect: toConnect(characterIds) } },
      include,
    }),
  update: (id: string, { characterIds, ...data }: EventUpdate) =>
    prisma.event.update({
      where: { id },
      data: { ...data, characters: characterIds && { set: toConnect(characterIds) } },
      include,
    }),
  softDelete: (id: string) =>
    prisma.event.update({ where: { id }, data: { deletedAt: new Date() } }),
};
