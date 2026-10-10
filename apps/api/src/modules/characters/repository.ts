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

export const characterRepository = {
  listByStory: (storyId: string) =>
    prisma.character.findMany({ where: { storyId, ...alive }, orderBy: { name: 'asc' } }),
  findById: (id: string) => prisma.character.findFirst({ where: { id, ...alive } }),
  /** Quantos dos ids informados são personagens vivos desta história. */
  countInStory: (storyId: string, ids: string[]) =>
    prisma.character.count({ where: { id: { in: ids }, storyId, ...alive } }),
  create: (storyId: string, { birthLocation, ...data }: CharacterCreate) =>
    prisma.character.create({ data: { ...data, ...birthColumns(birthLocation), storyId } }),
  update: (id: string, { birthLocation, ...data }: CharacterUpdate) =>
    prisma.character.update({ where: { id }, data: { ...data, ...birthColumns(birthLocation) } }),
  softDelete: (id: string) =>
    prisma.character.update({ where: { id }, data: { deletedAt: new Date() } }),

  // ---------- lixeira ----------
  listDeletedByStory: (storyId: string) =>
    prisma.character.findMany({ where: { storyId, ...trashed }, orderBy: { deletedAt: 'desc' } }),
  findDeletedById: (id: string) => prisma.character.findFirst({ where: { id, ...trashed } }),
  restore: (id: string) =>
    prisma.character.update({ where: { id }, data: { deletedAt: null } }),
  /** Remove de vez; os vínculos com eventos caem em cascata (os eventos ficam). */
  purge: (id: string) => prisma.character.delete({ where: { id } }),
};
