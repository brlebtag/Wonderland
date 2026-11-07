import type { EventLocation } from '@wonderland/shared';
import { prisma } from '../../db';
import type { CharacterCreate, CharacterUpdate } from './schemas';

// Um personagem só é visível se ele e a sua história não estiverem apagados.
const alive = { deletedAt: null, story: { deletedAt: null } };
// Na lixeira da história: o personagem apagado, mas a história não.
const trashed = { deletedAt: { not: null }, story: { deletedAt: null } };

/** { kind, id } da API ↔ colunas birthLocationKind/birthLocationId. */
const birthColumns = (location: EventLocation | null | undefined) =>
  location === undefined
    ? {}
    : { birthLocationKind: location?.kind ?? null, birthLocationId: location?.id ?? null };

// As tags saem como lista de nomes, em ordem alfabética.
const withTags = { tagLinks: { include: { tag: true } } } as const;
type WithTagLinks = { tagLinks: { tag: { name: string } }[] };
const flatTags = <T extends WithTagLinks>({ tagLinks, ...c }: T) => ({
  ...c,
  tags: tagLinks.map((l) => l.tag.name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
});
const one = async <T extends WithTagLinks>(p: Promise<T | null>) => {
  const c = await p;
  return c && flatTags(c);
};
const many = async <T extends WithTagLinks>(p: Promise<T[]>) => (await p).map(flatTags);

/** Vínculos com as tags: undefined = não mexe; lista = substitui. */
const tagLinks = (tagIds: string[] | undefined, replace: boolean) =>
  tagIds === undefined
    ? {}
    : { tagLinks: { ...(replace ? { deleteMany: {} } : {}), create: tagIds.map((tagId) => ({ tagId })) } };

type Data<T> = Omit<T, 'tags'> & { tagIds?: string[] };

export const characterRepository = {
  listByStory: (storyId: string) =>
    many(prisma.character.findMany({ where: { storyId, ...alive }, orderBy: { name: 'asc' }, include: withTags })),
  findById: (id: string) => one(prisma.character.findFirst({ where: { id, ...alive }, include: withTags })),
  /** Quantos dos ids informados são personagens vivos desta história. */
  countInStory: (storyId: string, ids: string[]) =>
    prisma.character.count({ where: { id: { in: ids }, storyId, ...alive } }),
  create: (storyId: string, { birthLocation, tagIds, ...data }: Data<CharacterCreate>) =>
    one(
      prisma.character.create({
        data: { ...data, ...birthColumns(birthLocation), ...tagLinks(tagIds, false), storyId },
        include: withTags,
      }),
    ),
  update: (id: string, { birthLocation, tagIds, ...data }: Data<CharacterUpdate>) =>
    one(
      prisma.character.update({
        where: { id },
        data: { ...data, ...birthColumns(birthLocation), ...tagLinks(tagIds, true) },
        include: withTags,
      }),
    ),
  softDelete: (id: string) =>
    prisma.character.update({ where: { id }, data: { deletedAt: new Date() } }),

  // ---------- lixeira ----------
  listDeletedByStory: (storyId: string) =>
    many(prisma.character.findMany({ where: { storyId, ...trashed }, orderBy: { deletedAt: 'desc' }, include: withTags })),
  findDeletedById: (id: string) => prisma.character.findFirst({ where: { id, ...trashed } }),
  restore: (id: string) =>
    one(prisma.character.update({ where: { id }, data: { deletedAt: null }, include: withTags })),
  /** Remove de vez; os vínculos com eventos caem em cascata (os eventos ficam). */
  purge: (id: string) => prisma.character.delete({ where: { id } }),
};
