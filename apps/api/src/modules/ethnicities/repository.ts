import { prisma } from '../../db';
import type { EthnicityCreate, EthnicityUpdate } from './schemas';

// Uma etnia só é visível se ela e a sua história não estiverem apagadas.
const alive = { deletedAt: null, story: { deletedAt: null } };
const trashed = { deletedAt: { not: null }, story: { deletedAt: null } };

export const ethnicityRepository = {
  listByStory: (storyId: string) =>
    prisma.ethnicity.findMany({ where: { storyId, ...alive }, orderBy: { name: 'asc' } }),
  findById: (id: string) => prisma.ethnicity.findFirst({ where: { id, ...alive } }),
  /** Etnia (viva ou na lixeira) desta história — usada para validar vínculos. */
  findInStory: (storyId: string, id: string) =>
    prisma.ethnicity.findFirst({ where: { id, storyId } }),
  countInStory: (storyId: string, ids: string[]) =>
    prisma.ethnicity.count({ where: { id: { in: ids }, storyId } }),
  create: (storyId: string, data: EthnicityCreate) =>
    prisma.ethnicity.create({ data: { ...data, storyId } }),
  update: (id: string, data: EthnicityUpdate) => prisma.ethnicity.update({ where: { id }, data }),
  softDelete: (id: string) =>
    prisma.ethnicity.update({ where: { id }, data: { deletedAt: new Date() } }),

  // ---------- lixeira ----------
  listDeletedByStory: (storyId: string) =>
    prisma.ethnicity.findMany({ where: { storyId, ...trashed }, orderBy: { deletedAt: 'desc' } }),
  findDeletedById: (id: string) => prisma.ethnicity.findFirst({ where: { id, ...trashed } }),
  restore: (id: string) => prisma.ethnicity.update({ where: { id }, data: { deletedAt: null } }),
  /** Remove de vez; personagens dessa etnia ficam sem etnia (onDelete: SetNull). */
  purge: (id: string) => prisma.ethnicity.delete({ where: { id } }),
};
