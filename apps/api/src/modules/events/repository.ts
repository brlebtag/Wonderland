import type { EventLocation } from '@wonderland/shared';
import { prisma } from '../../db';
import type { EventCreate, EventUpdate } from './schemas';

// Um evento só é visível se ele e a sua história não estiverem apagados.
const alive = { deletedAt: null, story: { deletedAt: null } };
// Na lixeira da história: o evento apagado, mas a história não.
const trashed = { deletedAt: { not: null }, story: { deletedAt: null } };

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

/** { kind, id } da API ↔ colunas locationKind/locationId. */
const locationColumns = (location: EventLocation | null | undefined) =>
  location === undefined
    ? {}
    : { locationKind: location?.kind ?? null, locationId: location?.id ?? null };

/**
 * O formulário só conhece personagens vivos; ao substituir os vínculos, mantém os de personagens
 * na lixeira para que voltem junto se forem restaurados.
 */
async function withTrashedCharacters(eventId: string, ids: string[]) {
  const trashedLinks = await prisma.character.findMany({
    where: { deletedAt: { not: null }, events: { some: { id: eventId } } },
    select: { id: true },
  });
  return [...new Set([...ids, ...trashedLinks.map((c) => c.id)])];
}

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
  create: (storyId: string, { characterIds, location, ...data }: EventCreate) =>
    prisma.event.create({
      data: {
        ...data,
        ...locationColumns(location),
        storyId,
        characters: { connect: toConnect(characterIds) },
      },
      include,
    }),
  update: async (id: string, { characterIds, location, ...data }: EventUpdate) =>
    prisma.event.update({
      where: { id },
      data: {
        ...data,
        ...locationColumns(location),
        characters: characterIds && {
          set: toConnect(await withTrashedCharacters(id, characterIds)),
        },
      },
      include,
    }),
  softDelete: (id: string) =>
    prisma.event.update({ where: { id }, data: { deletedAt: new Date() } }),

  // ---------- lixeira ----------
  listDeletedByStory: (storyId: string) =>
    prisma.event.findMany({ where: { storyId, ...trashed }, include, orderBy: { deletedAt: 'desc' } }),
  findDeletedById: (id: string) => prisma.event.findFirst({ where: { id, ...trashed } }),
  restore: (id: string) =>
    prisma.event.update({ where: { id }, data: { deletedAt: null }, include }),
  /** Remove de vez; os vínculos com personagens caem em cascata. */
  purge: (id: string) => prisma.event.delete({ where: { id } }),
};
